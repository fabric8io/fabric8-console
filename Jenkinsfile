#!/usr/bin/groovy
node{
  ws{
    checkout scm
    sh "git remote set-url origin git@github.com:fabric8io/fabric8-console.git"

    def pipeline = load 'release.groovy'

    stage 'Stage'
    def stagedProject = pipeline.stage()

    stage 'Deploy'
    echo 'avoid deploy as kubernetes cluster is down'
    //pipeline.deploy(OPENSHIFT_URL, OPENSHIFT_DOMAIN, KUBERNETES_URL, KUBERNETES_DEFAULT_NAMESPACE, OPENSHIFT_STAGING_DOCKER_REGISTRY_URL, KUBERNETES_STAGING_DOCKER_REGISTRY_URL)

    stage 'Approve'
    //pipeline.approveRelease(stagedProject)

    stage 'Promote'
    pipeline.release(stagedProject)

    stage 'Update downstream dependencies'
    pipeline.updateDownstreamDependencies(stagedProject)
  }
}
