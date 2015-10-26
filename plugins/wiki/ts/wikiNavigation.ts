/// <reference path="../../includes.ts"/>


/**
 * @module Wiki
 */
module Wiki {

  Developer.customProjectSubTabFactories.push(
    (context) => {
      var projectLink = context.projectLink;
      var projectName = context.projectName;
      var owner = "";
      var repoName = "";
      if (projectName) {
        // TODO this is a bit of a hack - we should expose this a bit better somewhere?
        var idx = projectName.indexOf('-');
        if (idx > 0) {
          owner = projectName.substring(0, idx);
          repoName = projectName.substring(idx + 1);
        }
      }
      return {
        isValid: () => projectLink && owner && repoName && Developer.forgeReadyLink(),
        href: UrlHelpers.join(projectLink, "wiki", owner, repoName, "view"),
        label: "Source",
        title: "Browse the source code of this project"
      };
    });


  export function createSourceBreadcrumbs($scope) {
    var sourceLink = $scope.$viewLink || UrlHelpers.join(startLink($scope), "view");
    return [
      {
        label: "Source",
        href: sourceLink,
        title: "Browse the source code of this project"
      }
    ]
  }

  export function createEditingBreadcrumb($scope) {
      return {
        label: "Editing",
        title: "Editing this file"
      };
  }
}
