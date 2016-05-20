#!/usr/bin/groovy
node{
  ws{
    checkout scm
    sh "git remote set-url origin git@github.com:fabric8io/fabric8-console.git"

    def pipeline = load 'release.groovy'

    stage 'Updating dependencies'
    def prId = pipeline.updateDependencies('http://central.maven.org/maven2/')

    stage 'Stage'
    def stagedProject = pipeline.stage()

    stage 'Deploy'
    pipeline.deploy(OPENSHIFT_URL, OPENSHIFT_DOMAIN, KUBERNETES_URL, KUBERNETES_DEFAULT_NAMESPACE, OPENSHIFT_STAGING_DOCKER_REGISTRY_URL, KUBERNETES_STAGING_DOCKER_REGISTRY_URL)

    stage 'Approve'
    pipeline.approveRelease(stagedProject)

    stage 'Promote'
    pipeline.release(stagedProject)
    if (prId != null){
      pipeline.mergePullRequest(prId)
    }
  }
}
