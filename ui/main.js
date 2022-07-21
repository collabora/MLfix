var html = (x) => {
  return x[0];
}

var hover = false;
var dragging = false;
var dragged_invalid = false;

ko.components.register('photo', {
  viewModel: function (params) {
    this.url = params.url
    this.label = params.label;
    this.caption = params.caption;
    this.original_label = params.label(); // for reverting all changes
    this.previous_label = params.label(); // used when toggling invalid
    this.marked = () => this.label() == model.invalid_label();
    this.mousedown = (photo, ev) => {dragged_invalid = !this.marked(); this.label(dragged_invalid ? model.invalid_label() : this.previous_label); dragging = true; ev.target.focus(); console.log(dragging, dragged_invalid); };
    this.mouseover = (photo, ev) => {
      // FIXME: dragging does not work
      hover = photo;
      if (!(ev.originalEvent.buttons & 1)) {
        // mouseup might be missed if the cursor went out of the window
        dragging = false; model.last_modified(+new Date());
      }
      if (dragging) this.marked(dragged_invalid ? model.invalid_label() : this.previous_label);
    };
    this.mouseup = () => { dragging = false; model.last_modified(+new Date()); };
    this.label.subscribe((lbl) => $.post('set_label', { idx: params.idx, label: lbl }));
    this.has_icon = () => model.label_icons()[this.label()];
    return this;
  },
  template: html`
    <div class="photo" data-bind="css: { marked: marked() },
                                  event: { mouseover: mouseover, mousedown: mousedown, mouseup: mouseup }
                                 ">
      <img class="photo-img lozad" data-bind="attr: { 'data-src': url }">
      <div class="photo-caption" data-bind="html: caption"></div>
      <div class="photo-label">
        <span data-bind="visible: !has_icon(), text: label()"></span>
        <img class="photo-label-icon" data-bind="attr: { src: 'icons/'+label() }, visible: has_icon()" />
      </div>
    </div>
  `,
});

ko.components.register('separator', {
  template: html`
    <h2>
      <img class="photo-label-icon" data-bind="attr: { src: 'icons/'+text }" />
      <span data-bind="text: text"></span>
    </h2>
  `,
});

window.addEventListener('keydown', (ev) => {
  if (ev.which >= 48 && ev.which <= 57) {
    var num = ev.which - 48;
    if (num == 0) num = 10;
    if (hover) {
      hover.previous_label = hover.label();
      hover.label(model.hotkey_labels()[num - 1] || num.toString());
      console.log('label change:', num, hover);
    }
  }
});

$(function () {
  var model = {
    photos: ko.observable([]),
    last_modified: ko.observable(),
    last_saved: ko.observable(),
    filter: ko.observable("all"),
    error: ko.observable(),
    hotkey_labels: ko.observable([]),
    label_icons: ko.observable(),
    invalid_label: ko.observable(),
    size: ko.observable(250),
  };
  model.marked_count = ko.computed(() => _.compact(_.map(model.photos(), (p) => p.label && p.label() == model.invalid_label())).length)
  model.photos_count = ko.computed(() => _.filter(model.photos(), ['kind', 'photo']).length)

  // FIXME: does not work?
  model.filtered_photos = ko.computed(() => {
    var filter = model.filter();
    if (filter == 'only valid') {
      return _.filter(model.photos(), (x) => !x.label || x.label() != model.invalid_label());
    } else if (filter == 'only invalid') {
      return _.filter(model.photos(), (x) => !x.label || x.label() == model.invalid_label());
    } else {
      return model.photos();
    }
  })

  model.revert_changes = () => {
    model.last_modified(false);
  }
  model.clear_all_marked = () => {
    // FIXME
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

  var update_photos = (photos) => {
    var n = 0;
    var load_next = () => {
      n += 250;
      model.photos(photos.slice(0, n));
      // observer.observe();
      if (n < photos.length)
        setTimeout(load_next, 10);
      // else
      //   setTimeout(() => observer.observe(), 200);
    }
    load_next();
  }

  var mlfixid = decodeURI(window.location.hash.substr(1));

  // model.last_modified.extend({rateLimit: 200}).subscribe(() => {
  //   if (!model.last_modified() || model.last_modified() == model.last_saved()) return;
  // });
  window.model = model;

  $.get("data", null, null, "text")
    .done((result) => {
      data = JSON5.parse(result);
      console.log(data, data.hotkey_labels);
      if (data.size) model.size(data.size);
      if (data.hotkey_labels) model.hotkey_labels(data.hotkey_labels);
      if (data.label_icons) model.label_icons(data.label_icons);
      // preload all the icons so they don't queue behind the dataset images
      model._preloaded_icons = _.map(model.label_icons(), (_, lbl) => { img = new Image(); img.src = 'icons/'+lbl });
      if (data.invalid_label) model.invalid_label(data.invalid_label);
      if (data.groups) {
        var baseurl = new URL('imgs/', window.location);
        data.groups.forEach(cl => { cl.photos.forEach(x => { x.kind = 'photo'; x.label = ko.observable(x.label); x.url = new URL(x.fname, baseurl).toString(); })});
        data = _.flatten(_.map(data.groups, x => [{ kind: 'separator', text: x.name }].concat(x.photos)));
      }
      update_photos(data);
    })
    .fail((err) => {
      model.error(`Error loading JSON file: ${err.statusText}`);
      console.error("Error loading JSON file:", err);
    });


  const observer = lozad('.lozad', {
    // should reduce flicker, does not seem to work on iOS :(
    // maybe: https://bugs.webkit.org/show_bug.cgi?id=198784 ?
    rootMargin: '120px 120px',
  });
  model.activate_lazy_load = function () { setTimeout(() => { console.log('lazy (re)load', $('.photo-img').length); observer.observe() }, 250); };

  ko.applyBindings(model, document.body.parentElement);
})
