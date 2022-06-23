## MLfix for images

Demo site:

https://ml.pages.collabora.com/mlfix-image/

You can click on the images to mark them or click-and-drag to mark multiple images at once. Your work is auto-saved
inside the browser so you are free to play and switch data sources and you are not going to lose your markings.
The results can be downloaded using the button in the top right but there is no import functionality yet so you cannot
yet do anything useful with the downloaded JSON inside the app.

### Harvesting data from Bing

Open a Bing Image search page, scroll to the very bottom and paste the script below into the Developer Tools window in your browser.
It will download 800+ image URLs into a json file named after your search query.

```javascript
//
// Based on (MIT):
// https://github.com/bgrins/devtools-snippets/tree/master/snippets/console-save
//
// Inspired by:
// https://www.freecodecamp.org/news/how-to-use-the-browser-console-to-scrape-and-save-data-in-a-file-with-javascript-b40f4ded87ef/
//

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

results = "";
for(var img of document.getElementsByClassName('iusc'))
  results +=  img.getAttribute('m')+"\n";
console.save(results, document.getElementById('sb_form_q').value+'.json');
```
