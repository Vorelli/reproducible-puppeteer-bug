FROM node:16.14-bullseye

ADD https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb ./google-chrome-stable_current_amd64.deb
RUN apt-get -y update && apt -y install ./google-chrome-stable_current_amd64.deb

RUN apt-get -y update && apt-get -y install libgbm1 fonts-arphic-ukai fonts-arphic-uming fonts-ipafont-mincho fonts-ipafont-gothic fonts-unfonts-core xvfb gconf-service libasound2 libatk1.0-0 libatk-bridge2.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation  libnss3 lsb-release xdg-utils wget

ENV CONTAINER=true
ARG PUPPETEER_SKIP_DOWNLOAD=true

RUN mkdir app && chown node app
USER node:node
WORKDIR /app

COPY --chown=node:node ./entrypoint.sh ./
RUN chmod +x ./entrypoint.sh

COPY --chown=node:node ./tsconfig.json ./
COPY --chown=node:node ./package*.json ./
COPY --chown=node:node ./src ./src

RUN npm i
RUN npm run build

RUN echo Extension check...$(ls extension 2> /dev/null)

RUN echo $(ls -al /app)
RUN echo $(ls /);
RUN echo $(ls /app);

CMD ./entrypoint.sh
