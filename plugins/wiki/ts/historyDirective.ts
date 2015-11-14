/// <reference path="../../includes.ts"/>
/// <reference path="wikiHelpers.ts"/>
/// <reference path="wikiPlugin.ts"/>

/**
 * @module Wiki
 */
module Wiki {
  _module.directive("commitHistoryPanel", () => {
    return {
      templateUrl: templatePath + 'historyPanel.html'
    };
  });
}
