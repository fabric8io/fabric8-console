#!/usr/bin/env bash
echo "Linking the hawtio-kubernetes.js to the local build"
rm libs/hawtio-kubernetes/dist/hawtio-kubernetes.js libs/hawtio-kubernetes/dist/hawtio-kubernetes.css
ln -s `pwd`/../hawtio-kubernetes/dist/hawtio-kubernetes.js libs/hawtio-kubernetes/dist/hawtio-kubernetes.js
ln -s `pwd`/../hawtio-kubernetes/dist/hawtio-kubernetes.css libs/hawtio-kubernetes/dist/hawtio-kubernetes.css
echo "Now the libs/hawtio-kubernetes/dist folder is:"
ls -l libs/hawtio-kubernetes/dist

# hawtio-kubernetes-api
ln -fs `pwd`/../hawtio-kubernetes-api/dist/hawtio-kubernetes-api.js libs/hawtio-kubernetes-api/dist/hawtio-kubernetes-api.js
echo "hawtio-kubernetes-api linked too..."
ls -la libs/hawtio-kubernetes-api/dist

# hawtio-forms
ln -fs `pwd`/../hawtio-forms/dist/hawtio-forms.js libs/hawtio-forms/dist/hawtio-forms.js
ln -fs `pwd`/../hawtio-forms/dist/hawtio-forms.css libs/hawtio-forms/dist/hawtio-forms.css
echo "hawtio-forms linked too..."
ls -la libs/hawtio-forms/dist

# hawtio-ui
ln -fs `pwd`/../hawtio-ui/dist/hawtio-ui.js libs/hawtio-ui/dist/hawtio-ui.js
ln -fs `pwd`/../hawtio-ui/dist/hawtio-ui.css libs/hawtio-ui/dist/hawtio-ui.css
echo "hawtio-ui linked too..."
ls -la libs/hawtio-ui/dist
