### Reproducible Bug for Puppeteer version 21.4.0

This repo is set up to spin up a chrome browser using puppeteer. It uses a simple plugin with a devtools_page that sends a request to a locally running Express server.

### How to run

1. Set puppeteer version in package.json to either 21.3.8/21.4.0 for the desired effect.
2. Run `./build.sh` which builds a docker image and tags it as nataletoscano/reproducible-puppeteer-bug:v1
3. Run `docker run nataletoscano/reproducible-puppeteer-bug:v1` to run the container
4. When failing, there should be a lack of `EXTENSION IS ONLINE!` messages in the docker logs for that container.
