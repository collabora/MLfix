var html = (x) => {
  return x[0];
}

var hover = false;
var dragging = false;
var dragged_invalid = false;

window.lookupGroup = (g) => {
  if (g == null) return;
  return model.group_labels()[g - 1] || g.toString();
}
window.lookupColor = (g) => {
  if (g == null) return;
  colors = model.group_colors();
  labels = model.group_labels();
  return colors[(labels.indexOf(g) || 0) % colors.length];
}

ko.components.register('photo', {
  viewModel: function (params) {
    this.murl = params.murl
    this.label = params.label
    this.dist_to_mean = params.dist_to_mean || 0;
    this.group = params.group;
    this.original_group = params.group(); // for reverting all changes
    this.previous_group = params.group(); // used when toggling invalid
    this.marked = () => this.group() == model.invalid_group();
    this.mousedown = (photo, ev) => {dragged_invalid = !this.marked(); this.group(dragged_invalid ? model.invalid_group() : this.previous_group); dragging = true; ev.target.focus(); console.log(dragging, dragged_invalid); };
    this.mouseover = (photo, ev) => {
      hover = photo;
      if (!(ev.originalEvent.buttons & 1)) {
        // mouseup might be missed if the cursor went out of the window
        dragging = false; model.last_modified(+new Date());
      }
      if (dragging) this.marked(dragged_invalid ? model.invalid_group() : this.previous_group);
    };
    this.mouseup = () => { dragging = false; model.last_modified(+new Date()); };
    this.group.subscribe((grp) => $.post('set_group', { idx: params.idx, group: grp }));
    this.has_icon = () => model.group_icons()[this.group()];
    return this;
  },
  template: html`
    <div class="photo" data-bind="css: { marked: marked() },
                                  event: { mouseover: mouseover, mousedown: mousedown, mouseup: mouseup }
                                 ">
      <img class="photo-img lozad" data-bind="attr: { 'data-src': murl }">
      <div class="photo-label" data-bind="html: label"></div>
      <div class="photo-group" data-bind="style: { backgroundColor: !has_icon() && lookupColor(group()) }">
        <span data-bind="visible: !has_icon(), text: group()"></span>
        <img class="photo-group-icon" data-bind="attr: { src: 'icons/'+group() }, visible: has_icon()" />
      </div>
    </div>
  `,
});

ko.components.register('separator', {
  template: html`
    <h2>
      <img class="photo-group-icon" data-bind="attr: { src: 'icons/'+text }" />
      <span data-bind="text: text"></span>
    </h2>
  `,
});

window.addEventListener('keydown', (ev) => {
  if (ev.which >= 48 && ev.which <= 57) {
    var num = ev.which - 48;
    if (num == 0) num = 10;
    if (hover) {
      hover.previous_group = hover.group();
      hover.group(model.group_labels()[num - 1] || num.toString());
      console.log('group', num, hover);
    }
  }
});

console.save = function (data, filename) {
  if (!data) {
    console.error('Console.save: No data')
    return;
  }

  if (!filename) filename = 'story.json'

  if (typeof data === "object") {
    data = JSON5.stringify(data, undefined, 4)
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
    // var group_colors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"];
    group_colors: ko.observable(["#fbb4ae", "#b3cde3", "#ccebc5", "#decbe4", "#fed9a6", "#ffffcc", "#e5d8bd", "#fddaec", "#f2f2f2"]),
    group_labels: ko.observable([]),
    group_icons: ko.observable(),
    invalid_group: ko.observable(),
    size: ko.observable(250),
    sources: [
    {"json_url":"../deepfashion2-256/barlow-twins-resnet18-pretrained-224-5e-proj2048-lr0.5e-3-sample-nosort.json", "name":"DeepFashion2 sample - random order"},
    {"json_url":"../deepfashion2-256/barlow-twins-resnet18-pretrained-224-5e-proj2048-lr0.5e-3-sample-1024vw.json", "name":"DeepFashion2 full dataset - sorted"},

    // {"json_url":"imagenet-n01742172/barlow-twins-resnet18-pretrained-224-5e-proj2048-lr0.5e-3-grouped.json", "name":"Boa 5"},
    // {"json_url":"imagenet-n01742172/barlow-twins-resnet18-pretrained-224-25e-proj2048-lr0.5e-3-grouped.json", "name":"Boa 25"},
    // {"json_url":"imagenet-n01742172/barlow-twins-resnet18-pretrained-224-75e-proj2048-lr0.5e-3-grouped.json", "name":"Boa 75"},
    // // {"json_url":"imagenet-n02114712/linear-1cls-5e-n02114712.json", "name":"Red wolf A"},
    // // {"json_url":"imagenet-n02114712/linear-5e-n02114712", "name":"Red wolf B"},

    // {"json_url":"imagenet-n02412080/nosort-n02412080.json", "name":"Sheep unsorted"},
    // {"json_url":"imagenet-n02412080/barlow-twins-resnet18-pretrained-224-5e-proj2048-lr0.5e-3-grouped.json", "name":"Sheep"},

    // {"json_url":"imagenet-n02701002/nosort-n02701002.json", "name":"Ambulance unsorted"},
    // {"json_url":"imagenet-n02701002/barlow-twins-resnet18-pretrained-224-5e-proj2048-lr0.5e-3-grouped.json", "name":"Ambulance 5"},
    // {"json_url":"imagenet-n02701002/barlow-twins-resnet18-pretrained-224-25e-proj2048-lr0.5e-3-grouped.json", "name":"Ambulance 25"},
    // {"json_url":"imagenet-n02701002/barlow-twins-resnet18-pretrained-224-75e-proj2048-lr0.5e-3-grouped.json", "name":"Ambulance 75"},
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
  model.toggle_fullscreen = () => {
    window.top.postMessage('mlfix-toggle-fullscreen-'+mlfixid, window.location);
  }

  model.dynamic_styles = () => {
    return `
      .photo-img {
        height: ${model.size()}px;
        max-width: ${model.size()*1.5}px;
        min-width: ${model.size()*0.5}px;
      }
    `
  }

  var update_photos = (photos, wip_override) => {
    if (wip_override) {
      wip_override = JSON5.parse(wip_override);
      photos = wip_override.photos;
      photos.forEach(x => {x.kind = 'photo'; x.marked = ko.observable(x.marked);});
      model.last_modified(wip_override.last_modified);
      model.last_saved(wip_override.last_modified);
    }
    var n = 0;
    var load_next = () => {
      n += 250;
      model.photos(photos.slice(0, n));
      observer.observe();
      if (n < photos.length && n < 5000)
        setTimeout(load_next, 10);
      else
        setTimeout(() => observer.observe(), 200);
    }
    load_next();
  }

  model.source.subscribe((source) => {
    console.log("source change: ", source, mlfixid);
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
            data = JSON5.parse(result);
          } catch (error) {
            console.error(error);
            data = {photos: _.map(_.compact(result.split(/\r?\n/)), JSON5.parse)};
            console.log('data:', data)
          }
          if (data.dist_threshold) {
            console.log("dist_threshold:", data.dist_threshold);
            model.dist_threshold(data.dist_threshold)
          }
          console.log(data, data.group_labels);
          if (data.size) model.size(data.size);
          if (data.group_colors) model.group_colors(data.group_colors);
          if (data.group_labels) model.group_labels(data.group_labels);
          if (data.group_icons) model.group_icons(data.group_icons);
          // preload all the icons so they don't queue behind the dataset images
          model._preloaded_icons = _.map(model.group_icons(), (_, grp) => { img = new Image(); img.src = 'icons/'+grp });
          if (data.invalid_group) model.invalid_group(data.invalid_group);
          console.log(model.group_labels(), model.size());
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
            var baseurl = new URL(source.json_url, new URL('imgs/', window.location));
            console.log('label-clustered:', data)
            data.labeled_clusters.forEach(cl => { cl.photos.forEach(x => { x.kind = 'photo'; x.group = ko.observable(x.group); x.murl = new URL(x.murl, baseurl).toString(); })});
            // console.log(data.clusters);
            data = _.flatten(_.map(data.labeled_clusters, x => [{ kind: 'separator', text: x.name }].concat(x.photos)));
          }
          update_photos(data, wip_override);
          // trigger the image lazy-loading
        }))
      .fail((err) => {
        model.error(`Error loading JSON file: ${err.statusText}`);
        console.error("Error loading JSON file:", err);
      });
  })

  var mlfixid = decodeURI(window.location.hash.substr(1));
  var json_url = "data";
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

  const observer = lozad('.lozad', {
    // should reduce flicker, does not seem to work on iOS :(
    // maybe: https://bugs.webkit.org/show_bug.cgi?id=198784 ?
    rootMargin: '120px 120px',
  });
  // we trigger it manually after loading the image list

  ko.applyBindings(model, document.body.parentElement);
})
