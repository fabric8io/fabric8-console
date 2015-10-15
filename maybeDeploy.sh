#!/bin/bash

git config --global push.default matching
git fetch --tags

LATEST=`cat LATEST`
CURRENT=`git tag --list | grep -v build | sort --version-sort | tail -n 1`

echo "Latest on disk: $LATEST"
echo "Latest in repo: $CURRENT"

if [ "$CURRENT" != "$LATEST" ]
then
  echo "Deploying new build for $CURRENT"
  git config --global user.email "circleci@mail.com" && \
  git config --global user.name "circleci" && \
  echo $CURRENT > LATEST && \
  git add LATEST && \
  git commit -m "Updating latest tag" && \
  git push && git push --tags && \
  echo "Pushing fabric8/fabric8-console:latest to Docker Hub" && \
  docker build -t fabric8/fabric8-console .
  docker login -e $BINTRAY_EMAIL -u $BINTRAY_USER -p $BINTRAY_PASS fabric8-docker-fabric8.bintray.io
  docker tag fabric8/fabric8-console fabric8-docker-fabric8.bintray.io/fabric8/fabric8-console
  docker push fabric8-docker-fabric8.bintray.io/fabric8/fabric8-console
  docker login -e $DOCKER_EMAIL -u $DOCKER_USER -p $DOCKER_PASS
  docker push fabric8/fabric8-console
# else
#  echo "Re-tagging new build for ${CURRENT}"
#  docker tag fabric8/fabric8-console fabric8/fabric8-console:${CURRENT}
#  docker push fabric8/fabric8-console:${CURRENT}
fi

