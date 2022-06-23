var html = (x) => {
  return x[0];
}

var dragging = false;
var dragging_state = false;

ko.components.register('photo', {
  viewModel: function (params) {
    // var this = params.photo
    this.murl = params.murl
    this.dist_to_mean = params.dist_to_mean || 0;
    this.marked = params.marked;
    this.mousedown = () => {dragging_state = !this.marked(); this.marked(dragging_state); dragging = true;};
    this.mouseover = (photo, ev) => {
      if (!(ev.originalEvent.buttons & 1)) {
        // mouseup might be missed if the cursor went out of the window
        dragging = false; model.last_modified(+new Date());
      }
      if (dragging) this.marked(dragging_state);
    };
    this.mouseup = () => { dragging = false; model.last_modified(+new Date()); };
    // FIXME: right click during drag makes it stick to dragging even after the mouse is released
    return this;
  },
  template: html`
    <div class="photo" data-bind="css: { marked: marked, highlighted: dist_to_mean < model.dist_threshold() }">
      <img class="photo-img" data-bind="attr: { src: murl }, event: { mouseover: mouseover, mousedown: mousedown, mouseup: mouseup }">
    </div>
  `,
});

ko.components.register('separator', {
  template: html`
    <h2 data-bind="text: text" />
  `,
});

console.save = function (data, filename) {
  if (!data) {
    console.error('Console.save: No data')
    return;
  }

  if (!filename) filename = 'story.json'

  if (typeof data === "object") {
    data = JSON.stringify(data, undefined, 4)
  }

  var blob = new Blob([data], {
    type: 'text/json'
  }),
    e = document.createEvent('MouseEvents'),
    a = document.createElement('a')

  a.download = filename
  a.href = window.URL.createObjectURL(blob)
  a.dataset.downloadurl = ['text/json', a.download, a.href].join(':')
  e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
  a.dispatchEvent(e)
}

$(function () {
  var model = {
    source: ko.observable({}),
    photos: ko.observable([]),
    last_modified: ko.observable(),
    last_saved: ko.observable(),
    filter: ko.observable("all"),
    error: ko.observable(),
    dist_threshold: ko.observable(0.5),
    sources: [
    {"json_url":"women-in-tshirts-256/barlow-twins-resnet18-pretrained-224-5e-proj2048-lr0.5e-3-sample-nosort.json", "name":"Women in T-shirts random order"},
    {"json_url":"women-in-tshirts-256/barlow-twins-resnet18-pretrained-224-5e-proj2048-lr0.5e-3-sample-1024vw.json", "name":"Women in T-shirts sorted"},
    {"json_url":"women-in-tshirts-256/barlow-twins-resnet18-pretrained-224-5e-proj2048-lr0.5e-3-grouped.json", "name":"Women in T-shirts (all)"},

    {"json_url":"imagenet-n01742172/barlow-twins-resnet18-pretrained-224-5e-proj2048-lr0.5e-3-grouped.json", "name":"Boa 5"},
    {"json_url":"imagenet-n01742172/barlow-twins-resnet18-pretrained-224-25e-proj2048-lr0.5e-3-grouped.json", "name":"Boa 25"},
    {"json_url":"imagenet-n01742172/barlow-twins-resnet18-pretrained-224-75e-proj2048-lr0.5e-3-grouped.json", "name":"Boa 75"},
    // {"json_url":"imagenet-n02114712/linear-1cls-5e-n02114712.json", "name":"Red wolf A"},
    // {"json_url":"imagenet-n02114712/linear-5e-n02114712", "name":"Red wolf B"},

    {"json_url":"imagenet-n02412080/nosort-n02412080.json", "name":"Sheep unsorted"},
    {"json_url":"imagenet-n02412080/barlow-twins-resnet18-pretrained-224-5e-proj2048-lr0.5e-3-grouped.json", "name":"Sheep"},

    {"json_url":"imagenet-n02701002/nosort-n02701002.json", "name":"Ambulance unsorted"},
    {"json_url":"imagenet-n02701002/barlow-twins-resnet18-pretrained-224-5e-proj2048-lr0.5e-3-grouped.json", "name":"Ambulance 5"},
    {"json_url":"imagenet-n02701002/barlow-twins-resnet18-pretrained-224-25e-proj2048-lr0.5e-3-grouped.json", "name":"Ambulance 25"},
    {"json_url":"imagenet-n02701002/barlow-twins-resnet18-pretrained-224-75e-proj2048-lr0.5e-3-grouped.json", "name":"Ambulance 75"},
    ]
  };
  model.dirty = ko.computed(() => model.last_modified() != model.last_saved());
  model.marked_count = ko.computed(() => _.compact(ko.toJS(_.map(model.photos(), 'marked'))).length)
  model.photos_count = ko.computed(() => _.filter(model.photos(), ['kind', 'photo']).length)

  model.filtered_photos = ko.computed(() => {
    var filter = model.filter();
    if (filter == 'only marked') {
      return _.filter(model.photos(), (x) => !x.marked || x.marked());
    } else if (filter == 'only unmarked') {
      return _.filter(model.photos(), (x) => !x.marked || !x.marked());
    } else {
      return model.photos();
    }
  })

  var serialize_data = () => ko.toJSON({
    source: model.source,
    photos: model.photos,
    last_modified: model.last_modified,
  })

  model.download_json = () => {
    console.log('downloading');
    console.save(serialize_data(), model.source().json_url)
  }
  model.revert_changes = () => {
    localforage.removeItem(model.source().json_url).catch(console.error);
    model.source(model.source());
    model.last_modified(false);
  }
  model.clear_all_marked = () => {
    for (photo of model.photos()) {
      if (photo.marked) photo.marked(false);
    }
    model.last_modified(+new Date());
  }

  var update_photos = (photos, wip_override) => {
    if (wip_override) {
      wip_override = JSON.parse(wip_override);
      photos = wip_override.photos;
      photos.forEach(x => {x.kind = 'photo'; x.marked = ko.observable(x.marked);});
      model.last_modified(wip_override.last_modified);
      model.last_saved(wip_override.last_modified);
    }
    var n = 0;
    var load_next = () => {
      n += 250;
      model.photos(photos.slice(0, n));
      if (n < photos.length)
        setTimeout(load_next, 10);
    }
    load_next();
  }

  model.source.subscribe((source) => {
    console.log("source change: ", source);
    if (source.dragged) {
      window.location.hash = '';
    } else {
      window.location.hash = '#' + encodeURI(source.json_url);
    }
    model.photos([]);
    $.get(source.json_url, null, null, "text")
      .done((result) =>
        localforage.getItem(source.json_url).catch(console.error).then((wip_override) => {
          try {
            data = JSON.parse(result);
          } catch (error) {
            console.error(error);
            data = {photos: _.map(_.compact(result.split(/\r?\n/)), JSON.parse)};
            console.log('data:', data)
          }
          if (data.dist_threshold) {
            console.log("dist_threshold:", data.dist_threshold);
            model.dist_threshold(data.dist_threshold)
          }
          // handle clustered photos
          if (data.photos) {
            data.photos.forEach(x => {x.kind = 'photo'; x.marked = ko.observable(x.marked);});
            data = data.photos;
          } else if (data.clusters) {
            data.clusters.forEach(cl => { cl.forEach(x => { x.kind = 'photo'; x.marked = ko.observable(x.marked); })});
            console.log('clustered:', data)
            data.clusters.forEach(cl => { cl.forEach(x => { x.kind = 'photo'; x.marked = ko.observable(x.marked); })});
            data = _.flatten(_.map(data.clusters, x => [{ kind: 'separator', text: `${x.length} similar photos` }].concat(x)));
          } else if (data.labeled_clusters) {
            var baseurl = new URL(source.json_url, window.location);
            console.log('label-clustered:', data)
            data.labeled_clusters.forEach(cl => { cl.photos.forEach(x => { x.kind = 'photo'; x.marked = ko.observable(x.marked); x.murl = new URL(x.murl, baseurl) })});
            // console.log(data.clusters);
            data = _.flatten(_.map(data.labeled_clusters, x => [{ kind: 'separator', text: x.name }].concat(x.photos)));
          }
          update_photos(data, wip_override)
        }))
      .fail((err) => {
        model.error(`Error loading JSON file: ${err.statusText}`);
        console.error("Error loading JSON file:", err);
      });
  })

  json_url = decodeURI(window.location.hash.substr(1)) || model.sources[0].json_url;
  model.source(_.find(model.sources, {json_url}) || { name: json_url, json_url: json_url });

  model.last_modified.extend({rateLimit: 200}).subscribe(() => {
    if (!model.last_modified() || model.last_modified() == model.last_saved()) return;
    if (model.source().dragged) return;
    // console.log('saving');
    // localforage.setItem(model.source().json_url, serialize_data()).catch(console.error)
    // model.last_saved(model.last_modified());
  });
  window.model = model;

  var handle_file = file => {
    console.log('upload:', file);
    if (file.type !== 'application/json') return;
    console.log('upload:', file.name, file.size);
    model.source({json_url: window.URL.createObjectURL(file), name: file.name, dragged: true})
  }

  var handle_file_drop = data => {
    if (data.items) {
      for (var i = 0; i < data.items.length; i++) {
        if (data.items[i].kind === 'file') {
          handle_file(data.items[i].getAsFile());
        }
      }
    } else {
      // Use DataTransfer interface to access the file(s)
      for (var i = 0; i < data.files.length; i++) {
        handle_file(data.files[i]);
      }
    }
  }

  /* full screen drag and drop */
  var drag_over = e => {e.stopPropagation(); e.preventDefault(); $('#drop-mask').show();};
  var drag_leave = e => {e.stopPropagation(); e.preventDefault(); $('#drop-mask').hide();};
  var drag_drop = e => {e.stopPropagation(); e.preventDefault(); $('#drop-mask').hide(); handle_file_drop(e.dataTransfer)};

  var dropMask = document.getElementById('drop-mask');

  window.addEventListener('dragover', drag_over, false);
  dropMask.addEventListener('dragleave', drag_leave, false);
  dropMask.addEventListener('drop', drag_drop, false);


  ko.applyBindings(model, document.body);
})
