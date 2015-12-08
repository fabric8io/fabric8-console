#!/usr/bin/env bash
echo "Linking the hawtio-kubernetes.js to the local build"
#rm libs/hawtio-kubernetes/dist/hawtio-kubernetes.js libs/hawtio-kubernetes/dist/hawtio-kubernetes.css
#rm -rf libs/hawtio-kubernetes/d.ts
ln -fs `pwd`/../hawtio-kubernetes/dist/hawtio-kubernetes.js libs/hawtio-kubernetes/dist/hawtio-kubernetes.js
ln -fs `pwd`/../hawtio-kubernetes/dist/hawtio-kubernetes.css libs/hawtio-kubernetes/dist/hawtio-kubernetes.css
#ln -s `pwd`/../hawtio-kubernetes/d.ts libs/hawtio-kubernetes
echo "Now the libs/hawtio-kubernetes/dist folder is:"
ls -la libs/hawtio-kubernetes/dist


