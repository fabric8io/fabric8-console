#!/usr/bin/env bash
echo "Linking the hawtio-kubernetes-api.js to the local build"
ln -fs `pwd`/../hawtio-kubernetes-api/dist/hawtio-kubernetes-api.js libs/hawtio-kubernetes-api/dist/hawtio-kubernetes-api.js
echo "Now the libs/hawtio-kubernetes-api/dist folder is:"
ls -la libs/hawtio-kubernetes-api/dist


