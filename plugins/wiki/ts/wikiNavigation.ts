/// <reference path="../../includes.ts"/>


/**
 * @module Wiki
 */
module Wiki {

  Developer.customProjectSubTabFactories.push(
    (context) => {
      var projectLink = context.projectLink;
      var wikiLink = null;
      if (projectLink) {
        wikiLink = UrlHelpers.join(projectLink, "wiki", "view");
      }
      return {
        isValid: () => wikiLink && Developer.forgeReadyLink(),
        href: wikiLink,
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
