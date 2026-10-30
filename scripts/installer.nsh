!macro customUnInstall
  ${IfNot} ${isUpdated}
    ${IfNot} ${Silent}
      MessageBox MB_OK "卸载将删除浏览器环境、登录数据、内核、代理、配置和软件数据目录中的下载文件。在线更新与覆盖安装会保留数据。" /SD IDOK
    ${EndIf}
    SetShellVarContext current
    RMDir /r "$LOCALAPPDATA\${APP_PACKAGE_NAME}-updater"
    ${If} $installMode == "all"
      SetShellVarContext all
    ${EndIf}
  ${EndIf}
!macroend
