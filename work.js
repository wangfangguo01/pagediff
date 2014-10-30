/**
 * Created by wangfangguo on 14-9-3.
 */
/**
 * Created by wangfangguo on 14-9-3.
 */
var http = require('http');
var url = require('url');
var fs = require('fs');
var root = __dirname.replace(/\\/g,'/');
var urlencode = require('qs');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var fork = require('child_process').fork;
var urlencode = require('urlencode');
var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport();
var server = http.createServer(function(req,res){
    req.setEncoding('utf8');
    handleServer(req,res);
});

var work;
process.on('message',function(m,tcp){
    if(m == 'server'){
        work = tcp;
        work.on('connection',function(socket){
            server.emit('connection',socket);
        });
    }
});

process.on('uncaughtException',function(err){
    console.log(err);
    process.exit();
});

function handleServer(req,res){
    var info = url.parse(req.url);
    console.log(req.method);
    res.writeHead(200,{"Access-Control-Allow-Methods":"GET, PUT, POST, DELETE, OPTIONS, HEAD","Access-Control-Allow-Origin":"*"});
    if(req.method == 'GET'){
        var getdata = {};
        //将query数据转化为标准的json对象
        if(info.query)
             getdata = JSON.parse(decodeURI(info.query));
        getdata.pathname = info.pathname;
        console.log(getdata);
        handleData(res,getdata);
    }
}


/*
这里进行路由处理，将GET请求路径分发到对应的处理函数
 */
function handleData(res,data){
    var usrInfo = {};
    usrInfo.status = "fail";//处理的初始状态为失败，如果处理函数成功执行，则会将结果覆盖为success
    var local = JSON.parse(fs.readFileSync(root+'/content.json','utf8'));//读出存储的数据，并转换为json格式数据
    switch(data.pathname){//进行处理函数分发
        case '/create':create(local,usrInfo,data);break;//创建一个project
        case '/editproject': editproject(local,usrInfo,data);break;//对项目进行编辑
        case '/editpage' : editpage(local,usrInfo,data);break;//对page进行修改
        case '/delpage' : delpage(local,usrInfo,data);break;//删除一个pagename
        case '/getproject' : getproject(local,usrInfo);break;//获取项目列表
        case '/action' : action(local,usrInfo,data);break;//构建一个pagename
        case '/getprojectinfo' : getprojectinfo(local,usrInfo,data);break;//获取一个项目的详细信息
        case '/getpagehistory' : getpagehistory(local,usrInfo,data);break;//获取一个pagename的详细信息
        case '/getpagehistoryinfo' : getpagehistoryinfo(local,usrInfo,data);break;//获取pagename构建历史
        case '/addpage' : addpage(local,usrInfo,data);break;//增加一个pagename
        case '/delproject': delproject(local,usrInfo,data);break;//删除一个项目
	    case '/execution' : execution(local,usrInfo,data);break;//文库的接口
        case '/executionsome' : executionsome(local,usrInfo,data);break;//部分构建
    }
    fs.writeFileSync(root+'/content.json',JSON.stringify(local),'utf8');//将更新后的数据存进文件
    res.write(JSON.stringify(usrInfo));//进行反馈
    res.end();
}

/*
通过data参数的name字段取出对应的项目，并构建项目中的全部pagename
构建完成后，统计构建成功数与失败的pagename数组，并发送邮件至配置的邮件地址
 */
function execution(local,usrInfo,data){
    //获得构建的五个要素project,pagename,time,urlold,urlnew
    var project = local[data.name];
    var project1 = data.name;
    var work = [];
    var fail = [];
    var success = project.url.length;
    var total = 0;
    for(var i = 0; i < project.url.length; i++){
        var pagename = project.url[i].pagename;
        var time = Date.parse(new Date());
        var urlold = project.url[i].urlold;
        var urlnew = project.url[i].urlnew;
        Construction(project1,pagename,time,urlold,urlnew,function(err,stdout,stderr){
            fs.appendFileSync('log.txt',time+ ' '+project1+ ' '+ pagename+" Interface"+"\n",'utf8');//写入统计日志
            total++;
            if(fs.existsSync('./'+project1+'/'+pagename+'/'+time+"/diff")){
                fail.push(pagename);
                success --;
            }
            if(total == project.url.length){
                var msg = '共有 ' + total + '个 page构建\n';
                msg += '成功构建 ' + success + '个\n';
                msg += '失败构建page如下 ：\n';
                for(var i = 0; i < fail.length; i++){
                    msg += fail[i]+'\n';
                }
                var options = {
                    from: 'wangfangguo@baidu.com',
                    to: null,
                    subject: '构建结果',
                    text:msg
                };
                for(var i = 0; i < local[project1].email.length; i++){
                    options.to  = local[project1].email[i];
                    sendMail(options,function(err,res){
                        if(!err)
                            console.log('email send success!');
                        else
                            console.log(err);
                    })
                }
            }
        })
    }
    usrInfo.status = 'success';
}

function executionsome(local,usrInfo,data){
    //获得构建的五个要素project,pagename,time,urlold,urlnew
    var project = local[data.name];
    var project1 = data.name;
    var fail = [];
    var success = project.url.length;
    var total = 0;
    for(var i = 0; i < project.url.length; i++){
        var pagename = project.url[i].pagename;
        if(!in_arr(pagename,data.pagename))
            continue;
        var time = Date.parse(new Date());
        var urlold = project.url[i].urlold;
        var urlnew = project.url[i].urlnew;
        Construction(project1,pagename,time,urlold,urlnew,function(err,stdout,stderr){
            fs.appendFileSync('log.txt',time+ ' '+project1+ ' '+ pagename+" Interface"+"\n",'utf8');//写入统计日志
            total++;
            if(fs.existsSync('./'+project1+'/'+pagename+'/'+time+"/diff")){
                fail.push(pagename);
                success --;
            }
            if(total == project.url.length){
                var msg = '共有 ' + total + '个 page构建\n';
                msg += '成功构建 ' + success + '个\n';
                msg += '失败构建page如下 ：\n';
                for(var i = 0; i < fail.length; i++){
                    msg += fail[i]+'\n';
                }
                var options = {
                    from: 'wangfangguo@baidu.com',
                    to: null,
                    subject: '构建结果',
                    text:msg
                };
                for(var i = 0; i < local[project1].email.length; i++){
                    options.to  = local[project1].email[i];
                    sendMail(options,function(err,res){
                        if(!err)
                            console.log('email send success!');
                        else
                            console.log(err);
                    })
                }
            }
        })
    }
    usrInfo.status = 'success';
}

function create(local,usrInfo,data){
    local[data.name] = {};
    local[data.name].url = data.url;
    for(var i = 0; i < data.url.length; i++){
   	local[data.name].url[i].lastactiontime = Date.parse(new Date());
    }
    local[data.name].desc = data.desc;
    local[data.name].email = data.email;
    usrInfo.status = "success";
}

function editproject(local,usrInfo,data){
    var oldname = data.oldname;
    local[oldname].desc = data.desc;
    local[oldname].email = data.email;
    local[data.newname] = local[oldname];
    usrInfo.status = "success";
    if(oldname != data.newname)
       delete local[oldname];
}

function getproject(local,usrInfo){
    usrInfo.project = [];
    for(var pro in local){
        var project = {};
        project.name = pro;
        project.email = local[pro].email;
        project.desc = local[pro].desc;
	usrInfo.project.push(project);
    }
    usrInfo.status = "success";
}

function action(local,usrInfo,data){
    //获得构建的五个要素project,pagename,time,urlold,urlnew
    var time = Date.parse(new Date());
    var project = data.name;
    var pagename = data.pagename;
    var page = serch(local[data.name],data.pagename);
    fs.appendFileSync('log.txt',time+ ' '+project+ ' '+ pagename+' Page'+"\n",'utf8');//写入统计日志
    var urlold = page.urlold;
    var urlnew = page.urlnew;
    Construction(project,pagename,time,urlold,urlnew,function(err,stdout,stderr){
        console.log(err);console.log(stdout);console.log(stderr);
        var sec = (Date.parse(new Date()) - time)/1000;
        var msg = "构建项目为 " + project + ", pagename 为 " + pagename + "\n";
        msg += "对比url为 ： \n";
        msg += urlold + "\n";
        msg += urlnew + "\n";
        msg += "构建结果 ： " ;
        if(fs.existsSync('./'+project+'/'+pagename+'/'+time+'/diff'))
            msg += "失败 ！\n";
        else
            msg += "成功 ！\n";
        msg += "构建共耗时 ： " + sec + "秒 ！ \n";
        msg += "结果查看 ： http://10.48.32.115:8083/#"+project+"&"+pagename+"\n";
        var options = {
            from: 'wangfangguo@baidu.com',
            to: null,
            subject: '网页对比结果',
            text:msg
        }
        for(var i = 0; i < local[project].email.length; i++){
            options.to  = local[project].email[i];
            sendMail(options,function(err,res){
                if(!err)
                    console.log('email send success!');
                else
                    console.log(err);
            })
        }
    });
    usrInfo.status = "success";
}

function editpage(local,usrInfo,data){
    var project = local[data.name];
    var page = serch(project,data.pagename);
    console.log()
    page.excludeSelectors = data.excludeSelectors;
    page.includeSelectors = data.includeSelectors;
    usrInfo.status = "success";
}

function getprojectinfo(local,usrInfo,data){
    var project = local[data.name];
    usrInfo.page = project.url;
    usrInfo.status = "success";
}

function getpagehistory(local,usrInfo,data){
    var project = data.name;
    var pagename = data.pagename;
    var page = serch(local[project],pagename);
    usrInfo.urlold = page.urlold;
    usrInfo.urlnew = page.urlnew;
    usrInfo.time = fs.readdirSync('./'+project+'/'+pagename);
    usrInfo.result = [];
    for(var i = 0; i < usrInfo.time.length; i++){
        if(fs.existsSync('./'+data.name+'/'+data.pagename+'/'+usrInfo.time[i]+'/diff'))
            usrInfo.result.push(0);
        else
            usrInfo.result.push(1);
    }
    usrInfo.status = 'success';
}

function getpagehistoryinfo(local,usrInfo,data){
    if(fs.existsSync('./'+data.name+'/'+data.pagename+'/'+data.time+'/pre/screenshot.png'))
        usrInfo.pre = Buffer(fs.readFileSync('./'+data.name+'/'+data.pagename+'/'+data.time+'/pre/screenshot.png')).toString('base64');
    else usrInfo.pre = 'wait';
    if(fs.existsSync('./'+data.name+'/'+data.pagename+'/'+data.time+'/now/screenshot.png'))
        usrInfo.now = Buffer(fs.readFileSync('./'+data.name+'/'+data.pagename+'/'+data.time+'/now/screenshot.png')).toString('base64');
    else
	usrInfo.now = 'wait';
    if(fs.existsSync('./'+data.name+'/'+data.pagename+'/'+data.time+'/diff/pre-now.png'))//如果生成了/diff文件夹，则存在差异
        usrInfo.diff = Buffer(fs.readFileSync('./'+data.name+'/'+data.pagename+'/'+data.time+'/diff/pre-now.png')).toString('base64');
    else
        usrInfo.diff = "nodiff";
    usrInfo.status = 'success';
}

function addpage(local,usrInfo,data){
    var page = {};
    page.pagename = data.pagename;
    page.urlold = data.urlold;
    page.urlnew = data.urlnew;
    page.excludeSelectors = data.excludeSelectors;
    page.includeSelectors = data.includeSelectors;
    page.lastactiontime = Date.parse(new Date());
    if(!fs.existsSync('./'+data.name+'/'+data.pagename))
        exec('mkdir ./'+data.name+'/'+data.pagename,function(){});
    local[data.name].url.push(page);
    usrInfo.lastactiontime = page.lastactiontime;
    usrInfo.status = 'success';
}

function createimg(name,url,dir){
    if(!fs.existsSync(__dirname+'/'+name))
        fs.mkdirSync(__dirname+'/'+name);
    var len = url.length;
    for(var i = 0; i < len; i++){
        if(!fs.existsSync('./'+name+'/'+url[i]))
            fs.mkdirSync('./'+name+'/'+url[i]);
        spawn('node',['../createimg.js',url[i],dir],{cwd:'./'+name});
    }
    usrInfo.status = 'success';
}

function delpage(local,usrInfo,data){
    var temp = local[data.name];
    temp.url = remove(temp.url,data.pagename);
    if(fs.existsSync(root+'/'+data.name+'/'+data.pagename)){
        exec('rm -rf '+'./'+data.name+'/'+data.pagename,function(err){
            console.log(err);
        });
     }
     usrInfo.status = 'success';
}

function delproject(local,usrInfo,data){
    if(fs.existsSync(root+'/'+data.name)){
        exec('rm -rf '+'./'+data.name,function(err){
            console.log(err);
        });
    }
    delete local[data.name];
    usrInfo.status = 'success';
}

function serch(project,pagename){
    var len = project.url.length;
    for(var i = 0; i < len; i++){
        var page = project.url[i];
        if(page.pagename == pagename)
            return page;
    }
}

function remove(arr,pagename){
    var des = [];
    for(var i = 0; i < arr.length; i++){
        if(arr[i].pagename != pagename)
            des.push(arr[i]);
    }
    return des;
}


var MailConf = {
    user:    "wangfangguo",
    password: "Wfg@7281146",
    host : 'email.baidu.com',
    port : 587
};

//禁发邮件列表，可写正则表达式
var forbiden = [
    'test@baidu.com'
];

//判断邮件地址是否在禁发邮件列表当中
function in_forbiden(addr){
    var len = forbiden.length;
    for(var i = 0; i < len; i++){
        if(typeof forbiden[i] == 'string'){
            if(forbiden[i] == addr)
                return true;
        }else {
            if(forbiden[i].test(addr)){
                return true;
            }
        }
    }
    return false;
}

function in_arr(tar,arr){
    for(var src in arr){
        if(src == tar)
            return true;
    }
    return false;
}

/*
var mailOptions = {
    from: 'your_email_addres',
    to: 'send_email_addres',
    subject: '主题',
    text:msg
}*/
//发送email,并提供回调函数
function sendMail(mailOptions,callback){
    var transporter = nodemailer.createTransport("SMTP",{
        secureConnection: false, // 使用 SSL
        host : MailConf.host,
        port : MailConf.port,
        debug : false,
        auth: {
            user: MailConf.user,
            pass: MailConf.password
        }
    });

    if(in_forbiden(mailOptions.to)){
        callback('forbiden email address!');
        return ;
    }

    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            callback(error);
        }else{
            callback(null,info.response);
        }
    });
}

//传入构建的五个必要参数project,pagename,time,urlold,urlnew
//并提供回调函数callback
function Construction(project,pagename,time,urlold,urlnew,callback){
    var reg = /http:\/\/*|\//gi;//匹配带有http头形式的URL
    if(!reg.test(urlold))
        urlold = 'http://'+urlold;
    if(!reg.test(urlnew)){
        urlnew = 'http://'+urlnew;
    }

    var urlold1 = url.parse(urlold);//urlold1是page-monitor进行urlold截图后生成的文件夹名称，这里是按与page-monitor相同规则得到文件夹名称，便于后续操作
    urlold1 = urlold1.hostname + (urlold1.port ? '-'+urlold1.port : '');
    var urlnew1 = url.parse(urlnew);
    urlnew1 = urlnew1.hostname + (urlnew1.port ? '-'+urlnew1.port : '');
    if(!fs.existsSync('./'+project))
        exec('mkdir ./'+project,function(){
        });
    if(!fs.existsSync('./'+project+'/'+pagename))
        exec('mkdir ./'+project+'/'+pagename,function(){
        });
    if(!fs.existsSync('./'+project+'/'+pagename+'/'+time))
        exec('mkdir ./'+project+'/'+pagename+'/'+time,function(){
            //urlold1和urlnew1是项目构建后page-monitor产生的中间文件夹名，不能修改，否则执行不正常
            //参数cwd的意义是该进程的执行环境
            exec('sh '+'/home/work/wangfangguo/backtestplatform/index.sh'+' '+project+' '+time+' '+pagename+' '+urlold+' '+urlnew+' '+urlold1+' '+urlnew1,{cwd : './'+project+'/'+pagename+'/'+time},
                function(err,stdout,stderr){
                    if(callback)
                        callback(err,stdout,stderr);//函数回调
                });
        });
}