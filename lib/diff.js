//如果进行截图的url地址不同，则不会自动进行差异对比，需要主动触发
var fs = require('fs');
var Monitor = require('page-monitor');
var url = process.argv[2];
//page-monitor的页面截图配置
var options = {
    walk: {
        invisibleElements : [ /* invisible elements */ ],
        ignoreChildrenElements: [ /* ignore children elements */ ],
        styleFilters: [ /* record styles */ ],
        attributeFilters: [ /* record attribute */ ],
        includeSelectors: [],
        excludeSelectors: [],
        ignoreTextSelectors: [ /* ignore text selectors */ ],
        ignoreChildrenSelectors: [ /* ignore children selectors */ ],
        root: 'body' // root selector
    }
};

var project = process.argv[3];
var pagename = process.argv[4];
//读取项目的页面配置，并设置到page-monitor的配置中
var local = JSON.parse(fs.readFileSync('/home/work/wangfangguo/backtestplatform'+'/content.json','utf8'));
options.walk.excludeSelectors = serch(local[project],pagename).excludeSelectors;
options.walk.includeSelectors = serch(local[project],pagename).includeSelectors;
function serch(project,pagename){
    var len = project.url.length;
    for(var i = 0; i < len; i++){
        var page = project.url[i];
        if(page.pagename == pagename)
            return page;
    }
}

//进行页面diff对比
var monitor = new Monitor(url,options);
monitor.diff('pre', 'now', function(code){
    console.log(monitor.log); // from phantom
    console.log('done, exit [' + code + ']');
});