var fs = require('fs');
var options = {//page-monitor的页面截图配置
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

var project = process.argv[4];
var pagename = process.argv[5];
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

//进行页面截图
var Monitor = require('page-monitor');
function create(url,dirname){
    var monitor = new Monitor(url,options);
     monitor.capture(function(code){
         console.log(monitor.log); // from phantom
         console.log('done, exit [' + code + ']');
     },dirname);
}
var preurl = process.argv[2];
var nowurl = process.argv[3];
create(preurl,'pre');
create(nowurl,'now');
