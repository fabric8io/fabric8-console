/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>

/**
 * @module Wiki
 */
module Wiki {

  /**
   * @class GitWikiRepository
   */
  export class GitWikiRepository {
    public directoryPrefix = "";
    private $http;
    private config;
    private baseUrl;
    private projectId;


    constructor($scope) {
      var ForgeApiURL = Kubernetes.inject<string>("ForgeApiURL");
      this.$http = Kubernetes.inject("$http");
      this.config = Forge.createHttpConfig();
      var owner = $scope.owner;
      var repoName = $scope.repoId;
      var projectId = $scope.projectId;
      this.projectId = projectId;
      var ns = $scope.namespace || Kubernetes.currentKubernetesNamespace();
      this.baseUrl = UrlHelpers.join(ForgeApiURL, "repos/project", ns, projectId);
    }

    public getPage(branch:string, path:string, objectId:string, fn) {
      // TODO ignoring objectId
      var query = null;
      if (branch) {
        query = "branch=" + branch;
      }
      this.doGet(UrlHelpers.join("content", path || "/"), query,
        (data, status, headers, config) => {
          if (data) {
            var details: any = null;
            if (angular.isArray(data)) {
              angular.forEach(data, (file) => {
                if (!file.directory && file.type === "dir") {
                  file.directory = true;
                }
              });
              details = {
                directory: true,
                children: data
              }
            } else {
              details = data;
              var content = data.content;
              if (content) {
                details.text = window.atob(content);
              }
            }
            fn(details);
          }
        });
    }

    public putPage(branch:string, path:string, contents:string, commitMessage:string, successFn, errorFn = null) {
      var query = null;
      if (branch) {
        query = "branch=" + branch;
      }
      if (commitMessage) {
        query = (query ? query + "&" : "") + "message=" + encodeURIComponent(commitMessage);
      }
      var body = contents;
      this.doPost(UrlHelpers.join("content", path || "/"), query, body,
        (data, status, headers, config) => {
          successFn(data);
        },
        errorFn);
    }

    /**
     * Return the history of the repository or a specific directory or file path
     * @method history
     * @for GitWikiRepository
     * @param {String} branch
     * @param {String} objectId
     * @param {String} path
     * @param {Number} limit
     * @param {Function} fn
     * @return {any}
     */
    public history(branch:string, objectId:string, path:string, limit:number, fn) {
      var query = null;
      if (branch) {
        query = "branch=" + branch;
      }
      if (limit) {
        query = (query ? query + "&" : "") + "limit=" + limit;
      }
      var commitId = objectId || branch;
      this.doGet(UrlHelpers.join("history", commitId, path), query,
        (data, status, headers, config) => {
          fn(data);
        });
    }

    public commitInfo(commitId:string, fn) {
      var query = null;
      this.doGet(UrlHelpers.join("commitInfo", commitId), query,
        (data, status, headers, config) => {
          fn(data);
        });
    }

    public commitDetail(commitId:string, fn) {
      var query = null;
      this.doGet(UrlHelpers.join("commitDetail", commitId), query,
        (data, status, headers, config) => {
          fn(data);
        });
    }

    public commitTree(commitId:string, fn) {
      var query = null;
      this.doGet(UrlHelpers.join("commitTree", commitId), query,
        (data, status, headers, config) => {
          fn(data);
        });
    }


    /**
     * Performs a diff on the versions
     * @method diff
     * @for GitWikiRepository
     * @param {String} objectId
     * @param {String} baseObjectId
     * @param {String} path
     * @param {Function} fn
     * @return {any}
     */
    public diff(objectId:string, baseObjectId:string, path:string, fn) {
      var query = null;
      var config: any = Forge.createHttpConfig();
      config.transformResponse = (data, headersGetter, status) => {
        log.info("got diff data: " + data);
        return data;
      };
      this.doGet(UrlHelpers.join("diff", objectId, baseObjectId, path), query,
        (data, status, headers, config) => {
          var details = {
            text: data,
            format: "diff",
            directory: false
          };
          fn(details);
        },
        null, config);
    }


    /**
     * Get the list of branches
     * @method branches
     * @for GitWikiRepository
     * @param {Function} fn
     * @return {any}
     */
    public branches(fn) {
      var query = null;
      this.doGet("listBranches", query,
        (data, status, headers, config) => {
          fn(data);
        });
    }

    public exists(branch:string, path:string, fn): Boolean {
      var answer = false;
      this.getPage(branch, path, null, (data) => {
        if (data.directory) {
          if (data.children.length) {
            answer = true;
          }
        } else {
          answer = true;
        }
        log.info("exists " + path + " answer = " + answer);
        if (angular.isFunction(fn)) {
          fn(answer);
        }
      });
      return answer;
    }

    public revertTo(branch:string, objectId:string, blobPath:string, commitMessage:string, fn) {
      if (!commitMessage) {
        commitMessage = "Reverting " + blobPath + " commit " + (objectId || branch);
      }
      var query = null;
      if (branch) {
        query = "branch=" + branch;
      }
      if (commitMessage) {
        query = (query ? query + "&" : "") + "message=" + encodeURIComponent(commitMessage);
      }
      var body = "";
      this.doPost(UrlHelpers.join("revert", objectId, blobPath || "/"), query, body,
        (data, status, headers, config) => {
          fn(data);
        });
    }

    public rename(branch:string, oldPath:string,  newPath:string, commitMessage:string, fn) {
      if (!commitMessage) {
        commitMessage = "Renaming page " + oldPath + " to " + newPath;
      }
      var query = null;
      if (branch) {
        query = "branch=" + branch;
      }
      if (commitMessage) {
        query = (query ? query + "&" : "") + "message=" + encodeURIComponent(commitMessage);
      }
      if (oldPath) {
        query = (query ? query + "&" : "") + "old=" + encodeURIComponent(oldPath);
      }
      var body = "";
      this.doPost(UrlHelpers.join("mv", newPath || "/"), query, body,
        (data, status, headers, config) => {
          fn(data);
        });
    }

    public removePage(branch:string, path:string, commitMessage:string, fn) {
      if (!commitMessage) {
        commitMessage = "Removing page " + path;
      }
      var query = null;
      if (branch) {
        query = "branch=" + branch;
      }
      if (commitMessage) {
        query = (query ? query + "&" : "") + "message=" + encodeURIComponent(commitMessage);
      }
      var body = "";
      this.doPost(UrlHelpers.join("rm", path || "/"), query, body,
        (data, status, headers, config) => {
          fn(data);
        });
    }

    public removePages(branch:string, paths:Array<string>, commitMessage:string, fn) {
      if (!commitMessage) {
        commitMessage = "Removing page" + (paths.length > 1 ? "s" : "") + " " + paths.join(", ");
      }
      var query = null;
      if (branch) {
        query = "branch=" + branch;
      }
      if (commitMessage) {
        query = (query ? query + "&" : "") + "message=" + encodeURIComponent(commitMessage);
      }
      var body = paths;
      this.doPost(UrlHelpers.join("rm"), query, body,
        (data, status, headers, config) => {
          fn(data);
        });
    }



    private doGet(path, query, successFn, errorFn = null, config = null) {
      var url = Forge.createHttpUrl(this.projectId, UrlHelpers.join(this.baseUrl, path));
      if (query) {
        url += "&" + query;
      }
      if (!errorFn) {
        errorFn = (data, status, headers, config) => {
          log.warn("failed to load! " + url + ". status: " + status + " data: " + data);
        };

      }
      if (!config) {
        config = this.config;
      }
      this.$http.get(url, config).
        success(successFn).
        error(errorFn);
    }

    private doPost(path, query, body, successFn, errorFn = null) {
      var url = Forge.createHttpUrl(this.projectId, UrlHelpers.join(this.baseUrl, path));
      if (query) {
        url += "&" + query;
      }
      if (!errorFn) {
        errorFn = (data, status, headers, config) => {
          log.warn("failed to load! " + url + ". status: " + status + " data: " + data);
        };

      }
      this.$http.post(url, body, this.config).
        success(successFn).
        error(errorFn);
    }


    private doPostForm(path, query, body, successFn, errorFn = null) {
      var url = Forge.createHttpUrl(this.projectId, UrlHelpers.join(this.baseUrl, path));
      if (query) {
        url += "&" + query;
      }
      if (!errorFn) {
        errorFn = (data, status, headers, config) => {
          log.warn("failed to load! " + url + ". status: " + status + " data: " + data);
        };

      }
      var config = Forge.createHttpConfig();
      if (!config.headers) {
        config.headers = {};
      }
      config.headers["Content-Type"] = "application/x-www-form-urlencoded; charset=utf-8";

      this.$http.post(url, body, config).
        success(successFn).
        error(errorFn);
    }



    public completePath(branch:string, completionText:string, directoriesOnly:boolean, fn) {
/*
      return this.git().completePath(branch, completionText, directoriesOnly, fn);
*/
    }


    /**
     * Returns the full path to use in the git repo
     * @method getPath
     * @for GitWikiRepository
     * @param {String} path
     * @return {String{
     */
    public getPath(path:string) {
      var directoryPrefix = this.directoryPrefix;
      return (directoryPrefix) ? directoryPrefix + path : path;
    }

    public getLogPath(path:string) {
      return Core.trimLeading(this.getPath(path), "/");
    }


    /**
     * Get the contents of a blobPath for a given commit objectId
     * @method getContent
     * @for GitWikiRepository
     * @param {String} objectId
     * @param {String} blobPath
     * @param {Function} fn
     * @return {any}
     */
    public getContent(objectId:string, blobPath:string, fn) {
/*
      var fullPath = this.getLogPath(blobPath);
      var git = this.git();
      if (git) {
        git.getContent(objectId, fullPath, fn);
      }
      return git;
*/
    }



    /**
     * Get the JSON contents of the path with optional name wildcard and search
     * @method jsonChildContents
     * @for GitWikiRepository
     * @param {String} path
     * @param {String} nameWildcard
     * @param {String} search
     * @param {Function} fn
     * @return {any}
     */
    public jsonChildContents(path:string, nameWildcard:string, search:string, fn) {
/*
      var fullPath = this.getLogPath(path);
      var git = this.git();
      if (git) {
        git.readJsonChildContent(fullPath, nameWildcard, search, fn);
      }
      return git;
*/
    }


    public git() {
/*
      var repository = this.factoryMethod();
      if (!repository) {
        console.log("No repository yet! TODO we should use a local impl!");
      }
      return repository;
*/
    }
  }
}
