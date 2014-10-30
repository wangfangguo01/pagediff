#!/bin/sh
project=$1
time=$2
pagename=$3
oldurl=$4
newurl=$5
oldurl1=$6
newurl1=$7
root="/home/work/wangfangguo/backtestplatform" #项目根目录
node $root/lib/createimg.js $oldurl $newurl $project $pagename  #调用craeteimg.js进行页面截图
if [ "$oldurl" != "$newurl" ]
then
cp -r ./$newurl1/* ./$oldurl1/ #将newurl1目录下的文件复制到oldurl1目录下
node $root/lib/diff.js $oldurl $project $pagename  #进行页面对比
fi
cp -r ./$oldurl1/* ./  #将截图对比后的文件全部复制到当前目录下（$root/$project/$pagename/$time）
rm -rf $oldurl1 $newurl1   #删除构建的中间文件
exit
