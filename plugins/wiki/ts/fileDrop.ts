/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>

/**
 * @module Wiki
 */
module Wiki {

  // controller for handling file drops
  export var FileDropController = _module.controller("Wiki.FileDropController", ["$scope", "FileUploader", "$route", "$timeout", "userDetails", ($scope, FileUploader, $route:ng.route.IRouteService, $timeout:ng.ITimeoutService, userDetails:Core.UserDetails) => {


    var uploadURI = Wiki.gitRestURL($scope, $scope.pageId) + '/';
    var uploader = $scope.uploader = new FileUploader({
      headers: {
        'Authorization': Core.authHeaderValue(userDetails)
      },
      autoUpload: true,
      withCredentials: true,
      method: 'POST',
      url: uploadURI
    });
    $scope.doUpload = () => {
      uploader.uploadAll();
    };
    uploader.onWhenAddingFileFailed = function (item /*{File|FileLikeObject}*/, filter, options) {
      log.debug('onWhenAddingFileFailed', item, filter, options);
    };
    uploader.onAfterAddingFile = function (fileItem) {
      log.debug('onAfterAddingFile', fileItem);
    };
    uploader.onAfterAddingAll = function (addedFileItems) {
      log.debug('onAfterAddingAll', addedFileItems);
    };
    uploader.onBeforeUploadItem = function (item) {
      if ('file' in item) {
        item.fileSizeMB = (item.file.size / 1024 / 1024).toFixed(2);
      } else {
        item.fileSizeMB = 0;
      }
      //item.url = UrlHelpers.join(uploadURI, item.file.name);
      item.url = uploadURI;
      log.info("Loading files to " + uploadURI);
      log.debug('onBeforeUploadItem', item);
    };
    uploader.onProgressItem = function (fileItem, progress) {
      log.debug('onProgressItem', fileItem, progress);
    };
    uploader.onProgressAll = function (progress) {
      log.debug('onProgressAll', progress);
    };
    uploader.onSuccessItem = function (fileItem, response, status, headers) {
      log.debug('onSuccessItem', fileItem, response, status, headers);
    };
    uploader.onErrorItem = function (fileItem, response, status, headers) {
      log.debug('onErrorItem', fileItem, response, status, headers);
    };
    uploader.onCancelItem = function (fileItem, response, status, headers) {
      log.debug('onCancelItem', fileItem, response, status, headers);
    };
    uploader.onCompleteItem = function (fileItem, response, status, headers) {
      log.debug('onCompleteItem', fileItem, response, status, headers);
    };
    uploader.onCompleteAll = function () {
      log.debug('onCompleteAll');
      uploader.clearQueue();
      $timeout(() => {
        log.info("Completed all uploads. Lets force a reload");
        $route.reload();
        Core.$apply($scope);
      }, 200);
    };
  }]);

}
