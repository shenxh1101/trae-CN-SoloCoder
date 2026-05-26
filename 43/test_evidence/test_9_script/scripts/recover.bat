@echo off
chcp 65001 >nul
echo ========================================
echo   文件分片恢复工具
echo ========================================
echo.
echo 原始文件: original.bin
echo 分片数量: 2
echo 加密类型: none
echo.
echo 正在检查分片文件...
set MISSING=0
if not exist "original.part1" (
  echo 缺失文件: original.part1
  set MISSING=1
)
if not exist "original.part2" (
  echo 缺失文件: original.part2
  set MISSING=1
)
if %MISSING%==1 (
  echo. 错误: 部分分片文件缺失，无法继续
  pause
  exit /b 1
)
echo 所有分片文件检查通过
echo.
echo 正在合并文件...
copy /b original.part1 + original.part2 "original.bin" >nul
if exist "%original_file%" (
  echo.
  echo 合并成功！文件已保存为: %original_file%
  echo.
  choice /c YN /m "是否删除分片文件"
  if errorlevel 2 goto :end
  if errorlevel 1 (
    del /f /q "original.part1"
    del /f /q "original.part2"
    echo 分片文件已删除
  )
) else (
  echo 合并失败！
)
:end
echo.
pause
