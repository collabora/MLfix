import random, string, os, json
import cherrypy
import pandas as pd
from IPython.display import display, HTML
from pathlib import Path

# FIXME: setup a package-local cherrypy server?
cherrypy.config.update({
    'server.socket_port': 0,
    'log.screen': False,
    'log.error_file': 'web-error.log',
    'log.access_file': 'web-error.log',
})
cherrypy.engine.start()

def MLfix(df, path=".", size=200, group='label', sort='score', label=None, invalid_label='invalid', hotkey_labels=[], label_icons=None, caption=None):
  self = MLfixImpl()
  self.df = df
  self.path = path
  self.size = size

  self.hotkey_labels = hotkey_labels
  self.invalid_label = invalid_label
  if invalid_label not in self.hotkey_labels: self.hotkey_labels.append(invalid_label)
  self.label_icons = label_icons or {}

  self.group_col = group
  self.sort_col = sort
  self.label_col = label
  self.caption_col = caption

  if self.group_col in df:
    self.groups = []
    for name,rows in df.groupby(self.group_col):
      self.add_group(name, rows)

  old_labels = None
  if self.label_col: old_labels = df[self.label_col]
  self.new_labels = pd.Series(data=old_labels, index=df.index, dtype=object, copy=True)
  self.display()
  return self.new_labels

class MLfixImpl:
  def __init__(self):
    pass

  def add_group(self, name, rows):
    if self.sort_col in rows:
      rows = rows.sort_values(self.sort_col)
    photos = []
    for row in rows.itertuples():
      photo = dict(dist_to_mean=0,
        fname=str(row.fname),
        idx=str(row.Index)
      )
      photo['label'] = getattr(row, self.label_col)
      if self.caption_col and hasattr(row, self.caption_col):
        photo['caption'] = getattr(row, self.caption_col)
      photos.append(photo)
    self.groups.append(dict(
      name = f"{name}",
      photos = photos
    ))

  def _cp_dispatch(self, vpath):
    if len(vpath) > 1 and vpath[0] == 'icons' and self.label_icons:
      cherrypy.request.params['label'] = vpath.pop(1)
      return vpath

    return vpath

  @cherrypy.expose
  def icons(self, label):
    return cherrypy.lib.static.serve_file(str(Path(self.label_icons[label]).absolute()))

  @cherrypy.expose
  def data(self):
    data = {}
    data['size'] = self.size
    data['invalid_label'] = self.invalid_label
    data['groups'] = self.groups
    data['label_icons'] = self.label_icons
    data['hotkey_labels'] = self.hotkey_labels
    return json.dumps(data)

  @cherrypy.expose
  def set_label(self, idx, label):
    print(idx, 'label =', label)
    self.new_labels.loc[idx] = label

  def display(self):
    frameid = 'mlfix-' + ''.join(random.choices(string.ascii_letters + string.digits, k=5))
    # FIXME: `frameid` here blocks any possible client-side caching
    cherrypy.tree.mount(self, '/'+frameid, {
      '/': {
        'tools.staticdir.on': True,
        # FXIME: fix pip packages, https://setuptools.pypa.io/en/latest/userguide/datafiles.html
        'tools.staticdir.dir':  os.path.join(os.path.dirname(__file__), 'ui'),
        'tools.staticdir.index': 'index.html',
      },
      '/imgs': {
        'tools.staticdir.on': True,
        # FIXME SECURITY: only serve files that are in the `df` index
        'tools.staticdir.dir': Path(self.path).absolute(),
      }
    })
    display(HTML("""
    <style>
      .mlfix-container {
        position: relative;
        background-color: white;
      }
      .mlfix-fullscreen {
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
        z-index: 10000;
      }
      .mlfix-fullscreen iframe {
        height: 100%;
      }
    </style>
    <div id="""+frameid+"""-container class=mlfix-container>
      <iframe id="""+frameid+""" data-src="proxy/"""+str(cherrypy.server.bound_addr[1])+"""/"""+frameid+"""/#"""+frameid+""""
              width="100%" height="500px" frameborder="0" allowfullscreen></iframe>
      <script>(function () {
        var iframe = document.getElementById('"""+frameid+"""');
        // FIXME: add exception handling and an error message
        var baseUrl = document.body.dataset['baseUrl'] || // Jupyter Notebook
                      JSON.parse(document.getElementById('jupyter-config-data').textContent).baseUrl; // JupyterLab
        iframe.src = new URL(iframe.dataset.src, new URL(baseUrl, window.location)).href;
        var outputEl = iframe.parentNode;
        var parentEl = outputEl.parentNode;
        console.log('MLfix init:', outputEl, parentEl);
        var bringMLfixIframeToFocus = function() {
            iframe.contentWindow.focus();
        }
        setTimeout(bringMLfixIframeToFocus, 100);

        var isFullscreen = false;
        var parentEl;
        window.addEventListener('message', (ev) => {
          if (ev.data == 'mlfix-toggle-fullscreen-"""+frameid+"""') {
            if (!isFullscreen) {
              $(outputEl).appendTo(document.body).addClass('mlfix-fullscreen');
            } else {
              $(outputEl).appendTo(parentEl).removeClass('mlfix-fullscreen');
            }
            isFullscreen = !isFullscreen;
            console.log('fullscreen', isFullscreen);
            setTimeout(bringMLfixIframeToFocus, 100);
          }
        });
      })();</script>
    </div>
    """))
