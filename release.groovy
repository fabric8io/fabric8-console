#!/usr/bin/groovy
def updateDependencies(source){

  def properties = []
  properties << ['<fabric8.version>','io/fabric8/kubernetes-api']
  properties << ['<docker.maven.plugin.version>','io/fabric8/docker-maven-plugin']

  updatePropertyVersion{
    updates = properties
    repository = source
    project = 'fabric8io/fabric8-console'
  }
}

def stage(){
  return stageProject{
    project = 'fabric8io/fabric8-console'
    useGitTagForNextVersion = true
  }
}

def approveRelease(project){
  def releaseVersion = project[1]
  approve{
    room = null
    version = releaseVersion
    console = null
    environment = 'fabric8'
  }
}

def release(project){
  releaseProject{
    stagedProject = project
    useGitTagForNextVersion = true
    helmPush = false
    groupId = 'io.fabric8.apps'
    githubOrganisation = 'fabric8io'
    artifactIdToWatchInCentral = 'fabric8-console'
    artifactExtensionToWatchInCentral = 'pom'
    promoteToDockerRegistry = 'docker.io'
    dockerOrganisation = 'fabric8'
    extraImagesToTag = ['fabric8-console']
  }
}

def mergePullRequest(prId){
  mergeAndWaitForPullRequest{
    project = 'fabric8io/fabric8-console'
    pullRequestId = prId
  }

}
return this;
