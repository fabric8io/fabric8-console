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


    constructor($scope) {
      var ForgeApiURL = Kubernetes.inject("ForgeApiURL");
      this.$http = Kubernetes.inject("$http");
      this.config = Forge.createHttpConfig();
      var owner = $scope.owner;
      var repoName = $scope.repoId;
      this.baseUrl = UrlHelpers.join(ForgeApiURL, "repos/user", owner, repoName);
    }

    public getPage(branch:string, path:string, objectId:string, fn) {
      // TODO ignoring objectId
      var query = null;
      if (branch) {
        query = "ref=" + branch;
      }
      this.doGet(UrlHelpers.join("content", path), query,
        (data, status, headers, config) => {
          if (data) {
            var details: any = null;
            if (angular.isArray(data)) {
              details = {
                directory: true,
                children: data
              }
            } else {
              details = data;
              var content = data.content;
              if (content) {
                details.text = content.decodeBase64();
              }
            }
            fn(details);
          }
        });
    }

    public putPage(branch:string, path:string, contents:string, commitMessage:string, fn) {
      var query = null;
      if (branch) {
        query = "ref=" + branch;
      }
      if (commitMessage) {
        query = (query ? query + "&" : "") + "message=" + encodeURIComponent(commitMessage);
      }
      var body = contents;
      this.doPost(UrlHelpers.join("content", path), query, body,
        (data, status, headers, config) => {
          fn(data);
        });
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
        query = "ref=" + branch;
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



    private doGet(path, query, successFn, errorFn = null, config = null) {
      var url = Forge.createHttpUrl(UrlHelpers.join(this.baseUrl, path));
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
      var url = Forge.createHttpUrl(UrlHelpers.join(this.baseUrl, path));
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
      var url = Forge.createHttpUrl(UrlHelpers.join(this.baseUrl, path));
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



    public getRepositoryLabel(fn, error) {
/*
      this.git().getRepositoryLabel(fn, error);
*/
    }

    public exists(branch:string, path:string, fn): Boolean {
/*
      var fullPath = this.getPath(path);
      return this.git().exists(branch, fullPath, fn);
*/
      return false;
    }

    public completePath(branch:string, completionText:string, directoriesOnly:boolean, fn) {
/*
      return this.git().completePath(branch, completionText, directoriesOnly, fn);
*/
    }



    public putPageBase64(branch:string, path:string, contents:string, commitMessage:string, fn) {
/*
      var fullPath = this.getPath(path);
      this.git().writeBase64(branch, fullPath, commitMessage, contents, fn);
*/
    }

    public createDirectory(branch:string, path:string, commitMessage:string, fn) {
/*
      var fullPath = this.getPath(path);
      this.git().createDirectory(branch, fullPath, commitMessage, fn);
*/
    }

    public revertTo(branch:string, objectId:string, blobPath:string, commitMessage:string, fn) {
/*
      var fullPath = this.getLogPath(blobPath);
      this.git().revertTo(branch, objectId, fullPath, commitMessage, fn);
*/
    }

    public rename(branch:string, oldPath:string,  newPath:string, commitMessage:string, fn) {
/*
      var fullOldPath = this.getPath(oldPath);
      var fullNewPath = this.getPath(newPath);
      if (!commitMessage) {
        commitMessage = "Renaming page " + oldPath + " to " + newPath;
      }
      this.git().rename(branch, fullOldPath, fullNewPath, commitMessage, fn);
*/
    }

    public removePage(branch:string, path:string, commitMessage:string, fn) {
/*
      var fullPath = this.getPath(path);
      if (!commitMessage) {
        commitMessage = "Removing page " + path;
      }
      this.git().remove(branch, fullPath, commitMessage, fn);
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
     * Get the list of branches
     * @method branches
     * @for GitWikiRepository
     * @param {Function} fn
     * @return {any}
     */
    public branches(fn) {
/*
      var git = this.git();
      if (git) {
        git.branches(fn);
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
