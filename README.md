# ML QA – using AI to explore and fix datasets
> This repository contains the training and inference code for the ML QA tools.


## Install

Please install from source for now:

`pip install -e .`

## How to use

This library contains command line tools to process the dataset. To start run the following commands:

```
qa_backend_downsize_images ./women-in-tshirts ./women-in-tshirts-256
qa_backend_pretrain --pretrained ./women-in-tshirts-256
qa_backend_extract_features ./women-in-tshirts-256
qa_backend_sort_images ./women-in-tshirts-256
```

Afterwards you can use the `./women-in-tshirts-256/barlow-twins-resnet18-pretrained-224-5e-proj2048-lr0.5e-3-grouped.json` file in the ML QA web app.
