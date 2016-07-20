declare module Github {
    var context: string;
    var hash: string;
    var pluginName: string;
    var pluginPath: string;
    var templatePath: string;
    var log: Logging.Logger;
    var githubClientId: string;
    function initScope($scope: any, $location: any, $routeParams: any): void;
}
