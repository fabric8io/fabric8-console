#!/usr/bin/env bash
echo "Linking the hawtio-kubernetes.js to the local build"
rm libs/hawtio-kubernetes/dist/hawtio-kubernetes.js libs/hawtio-kubernetes/dist/hawtio-kubernetes.css
ln -s `pwd`/../hawtio-kubernetes/dist/hawtio-kubernetes.js libs/hawtio-kubernetes/dist/hawtio-kubernetes.js
ln -s `pwd`/../hawtio-kubernetes/dist/hawtio-kubernetes.css libs/hawtio-kubernetes/dist/hawtio-kubernetes.css
echo "Now the libs/hawtio-kubernetes/dist folder is:"
ls -l libs/hawtio-kubernetes/dist
