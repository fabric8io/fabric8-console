## fabric8-console [![Circle CI](https://circleci.com/gh/fabric8io/fabric8-console.svg?style=svg)](https://circleci.com/gh/fabric8io/fabric8-console)

This project collects a number of hawtio plugins together to create a console for [fabric8](https://fabric8.io).

#### Running the console locally

First clone the source

    git clone https://github.com/fabric8io/fabric8-console.git
    cd fabric8-console

Next you'll need to [install NodeJS](http://nodejs.org/download/) and then install the default global npm dependencies:

    npm install -g bower gulp 

Then install all local nodejs packages and update bower dependencies via:

    npm install
    bower update

Next you need to setup the **KUBERNETES_MASTER** environment variable to point to the kubernetes master you want to run against. e.g.

    export KUBERNETES_MASTER=https://$DOCKER_IP:8443

Where **DOCKER_IP** is the IP address or host running the kubernetes master.

If you need to disable OAUTH authentication in development try use **DISABLE_OAUTH**:

    export DISABLE_OAUTH=true

Then to run the web application:

    gulp

##### Coming back to hack on the console after awhile?

Make sure you're running with the latest code and plugins:

* `git pull`
* `npm update`
* `bower update`

Or: `git pull && npm update && bower update`

Windows pro-tip: `$errorActionPreference='Stop'; git pull; npm update; bower update;`

Also, make sure you keep your globally installed node programs up to date with an `npm update -g`

#### Hacking on other plugins + the console

Much of the functionality in fabric8-console is provided by other hawtio plugins.  However it's possible to run builds of those plugins in parallel and view your changes in the running console.  For example to also hack on [hawtio-kubernetes](https://github.com/hawtio/hawtio-kubernetes) but also have fabric8-console running, you can clone the hawtio-kubernetes repo and pass the `--out` flag to `gulp watch`, specifying the `libs/hawtio-kubernetes/dist/` as the output folder.  More info in the [readme](https://github.com/hawtio/hawtio-kubernetes/blob/master/ReadMe.md) for hawtio-kubernetes, and other hawtio plugins that support this.
