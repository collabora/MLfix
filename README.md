# MLfix – using AI and UI to explore and fix datasets



## Install

Please install from source for now:

`pip install -e .`

## How to use

This library contains command line tools to process the image. To start with the [Women in T-Shirts dataset](https://github.com/collabora/women-in-t-shirts), run the following commands:

```
git clone https://github.com/collabora/women-in-t-shirts.git
qa_backend_pretrain --pretrained ./women-in-tshirts  # trains a model and generates the BoVW features
qa_backend_sort_images ./women-in-tshirts            # creates a JSON with all images sorted by similarity
```

Afterwards you can go run `python -m http.server` and go to the URL:
`http://localhost:8000/mlfix-ui/#../women-in-tshirts/barlow-twins-resnet18-pretrained-224-5e-proj2048-lr0.5e-3-grouped.json` to load the MLfix web app.

If you want to run it on you own data it may help to resize the images first:
```
qa_backend_downsize_images ./women-in-tshirts-large ./women-in-tshirts
```
