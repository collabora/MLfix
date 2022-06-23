# MLfix – using AI and UI to explore and fix datasets



[![Join the chat at https://gitter.im/MLfix/community](https://badges.gitter.im/MLfix/community.svg)](https://gitter.im/MLfix/community?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

This repository contains tools which can help you find mistakes in your labels. It helps if you have some image dataset (for example an object detection dataset with bounding boxes) and you:

1. want to make sure the objects are assigned to the correct class and bounding boxes are drawn
2. wish to explore it and discover the different variations occuring in the data

The tools work by sorting the images by visual similarity and then showing them in a streamlined user interface. The interface allows you to mark the photos so you can perform the QA process. The visual similarity sorting is based on a model trained in an unsupervised manner so it's not limited to ImageNet-like data.

![A futuristic robot cleaning streets of New York that are overflowing with papers.](banner.jpg)
Is your dataset overflowing with low quality samples? Our highly-skilled robots can help you!

## How to use

This library contains command line tools to process the image. Right now it's easiest to start with any dataset in the ImageNet format (one folder per class) or with just a folder of unsorted pictures. For example if you download [the DeepFashion2 dataset](https://github.com/switchablenorms/DeepFashion2) you can run the following commands:


```
git clone https://github.com/collabora/MLfix.git
cd MLfix
pip install -e .
qa_backend_downsize_images ./deepfashion2 ./deepfashion2-256
qa_backend_pretrain --pretrained ./deepfashion2-256  # trains a model (starting from ImageNet weights)
                                                     # and generates the BoVW features
qa_backend_sort_images ./deepfashion2-256            # creates a JSON with all images sorted by similarity
```

Afterwards you can go run `python -m http.server` and go to the URL:
`http://localhost:8000/mlfix-ui/#../deepfashion2-256/barlow-twins-resnet18-pretrained-224-5e-proj2048-lr0.5e-3-sample-nosort.json` to load the MLfix web app.

If you want to run it on you own data it may help to resize the images first:
```

```
