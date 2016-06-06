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
        case "aws-sqs":
        case "direct":
        case "direct-vm":
        case "jms":
        case "sjms":
        case "vm":
          scheme = "seda";
          break;

        case "validator":
          scheme = "bean-validator";
          break;

        case "xslt":
        case "xquery":
          scheme = "xmlrpc";
          break;

        case "scheduler":
          scheme = "timer";
          break;

        case "rest":
        case "rest-api":
        case "cxfrs":
          scheme = "http";
          break;

        case "aws-ddb":
        case "aws-sdb":
        case "cql":
        case "elsql":
        case "gora":
        case "krati":
        case "pgevent":
          scheme = "sql";
          break;
      }
      icon = camelEndpointIcons[scheme];
    }
    if (!icon) {
      icon = camelEndpointIcons["core"] || "/img/icons/camel/endpoint24.png";
    }
    return icon;
  }


  export function addCamelIcon(map, fileName) {
    var postfix = "24.png";
    if (angular.isString(fileName) && fileName.endsWith(postfix)) {
      map[fileName.substring(0, fileName.length - postfix.length)] = "/img/icons/camel/" + fileName;
    }
    return map;
  }

  export function addCamelEndpointIcon(map, fileName) {
    var prefix = "camel-";
    if (angular.isString(fileName) && fileName.startsWith(prefix)) {
      angular.forEach(["_200x150.png", ".svg", ".png"], (postfix) => {
        if (fileName.endsWith(postfix)) {
          map[fileName.substring(prefix.length, fileName.length - postfix.length)] = "/img/icons/camel/" + fileName;
        }
      });
    }
    return map;
  }
}
