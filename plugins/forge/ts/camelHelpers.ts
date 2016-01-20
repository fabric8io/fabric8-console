// <reference path="../../includes.ts"/>
/// <reference path="forgeHelpers.ts"/>

module Forge {

  export function getCamelComponentIconUrl(scheme) {
    var icon = null;
    if (scheme) {
      icon = camelEndpointIcons[scheme];
    }
    if (!icon) {
      switch (scheme) {
        case "scheduler":
          scheme = "timer";
          break;

        case "rest":
        case "rest-api":
          scheme = "http";
          break;
      }
      icon = camelEndpointIcons[scheme];
    }
    if (!icon) {
      icon = camelEndpointIcons["core"] || "/img/icons/camel/endpoint24.png";
    }
    return icon;
  }
}
