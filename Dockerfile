FROM ubuntu:bionic
WORKDIR /usr/src/app
RUN apt-get update
RUN apt-get -y install apt-transport-https curl apt-utils gnupg
RUN curl -sSL https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add -
RUN echo "deb https://deb.nodesource.com/node_10.x bionic main" | tee /etc/apt/sources.list.d/nodesource.list
RUN apt-get update
RUN apt-get -y install build-essential libssl-dev libboost-all-dev software-properties-common nodejs git libboost-filesystem1.62.0 libboost-date-time1.62.0 libboost-coroutine1.62.0 libboost-context1.62.0 libboost-chrono1.62.0 libboost-atomic1.62.0
EXPOSE 31415
