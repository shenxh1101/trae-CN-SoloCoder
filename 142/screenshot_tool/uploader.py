import os
import io
import ftplib
import socket
from typing import Optional, Dict, Any, Tuple
import requests


class UploadError(Exception):
    pass


class ConnectionError(UploadError):
    pass


class AuthenticationError(UploadError):
    pass


class FileTransferError(UploadError):
    pass


class FileUploader:
    @staticmethod
    def test_ftp_connection(host: str, username: str, password: str,
                            port: int = 21, use_tls: bool = False,
                            timeout: int = 10) -> Tuple[bool, str]:
        print(f"正在测试FTP连接: {host}:{port}...")
        ftp = None
        try:
            if use_tls:
                ftp = ftplib.FTP_TLS()
                ftp.connect(host, port, timeout=timeout)
                ftp.login(username, password)
                ftp.prot_p()
            else:
                ftp = ftplib.FTP()
                ftp.connect(host, port, timeout=timeout)
                ftp.login(username, password)
            
            welcome = ftp.getwelcome()
            print(f"FTP连接成功! 欢迎信息: {welcome[:100]}")
            
            try:
                ftp.pwd()
                print("FTP目录访问正常")
            except Exception as e:
                print(f"警告: 无法获取当前目录: {e}")
            
            ftp.quit()
            return True, "连接成功"
            
        except socket.timeout:
            msg = f"FTP连接超时: {host}:{port}"
            print(f"❌ {msg}")
            return False, msg
        except ConnectionRefusedError:
            msg = f"FTP连接被拒绝: {host}:{port}"
            print(f"❌ {msg}")
            return False, msg
        except ftplib.error_perm as e:
            if str(e).startswith("530"):
                msg = f"FTP认证失败: 用户名或密码错误"
            else:
                msg = f"FTP权限错误: {e}"
            print(f"❌ {msg}")
            return False, msg
        except Exception as e:
            msg = f"FTP连接失败: {e}"
            print(f"❌ {msg}")
            return False, msg
        finally:
            if ftp:
                try:
                    ftp.close()
                except:
                    pass

    @staticmethod
    def test_http_connection(url: str, headers: Optional[Dict[str, str]] = None,
                             timeout: int = 10) -> Tuple[bool, str]:
        print(f"正在测试HTTP连接: {url}...")
        try:
            response = requests.options(
                url,
                headers=headers,
                timeout=timeout,
                allow_redirects=True
            )
            print(f"HTTP连接成功! 状态码: {response.status_code}")
            if response.headers:
                server = response.headers.get('Server', 'Unknown')
                print(f"服务器: {server}")
            return True, "连接成功"
        except requests.exceptions.Timeout:
            msg = f"HTTP连接超时: {url}"
            print(f"❌ {msg}")
            return False, msg
        except requests.exceptions.ConnectionError as e:
            msg = f"HTTP连接失败: 无法连接到服务器 - {e}"
            print(f"❌ {msg}")
            return False, msg
        except requests.exceptions.HTTPError as e:
            msg = f"HTTP错误: {e}"
            print(f"❌ {msg}")
            return False, msg
        except Exception as e:
            msg = f"HTTP测试失败: {e}"
            print(f"❌ {msg}")
            return False, msg

    @staticmethod
    def test_connection(config: Dict[str, Any]) -> Tuple[bool, str]:
        upload_type = config.get("type", "").lower()
        if upload_type == "ftp":
            return FileUploader.test_ftp_connection(
                host=config["host"],
                username=config.get("username", ""),
                password=config.get("password", ""),
                port=config.get("port", 21),
                use_tls=config.get("use_tls", False),
                timeout=config.get("timeout", 10)
            )
        elif upload_type == "http":
            return FileUploader.test_http_connection(
                url=config["url"],
                headers=config.get("headers"),
                timeout=config.get("timeout", 10)
            )
        else:
            msg = f"不支持的上传类型: {upload_type}"
            print(f"❌ {msg}")
            return False, msg

    @staticmethod
    def upload_ftp(filepath: str, host: str, username: str, password: str,
                   remote_dir: str = "/", port: int = 21,
                   use_tls: bool = False, max_retries: int = 3,
                   retry_delay: int = 2) -> bool:
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"文件不存在: {filepath}")
        
        filename = os.path.basename(filepath)
        file_size = os.path.getsize(filepath)
        
        for attempt in range(1, max_retries + 1):
            ftp = None
            try:
                print(f"FTP上传 [{attempt}/{max_retries}]: {filename} ({file_size} bytes)")
                
                if use_tls:
                    ftp = ftplib.FTP_TLS()
                    ftp.connect(host, port, timeout=30)
                    ftp.login(username, password)
                    ftp.prot_p()
                else:
                    ftp = ftplib.FTP()
                    ftp.connect(host, port, timeout=30)
                    ftp.login(username, password)
                
                if remote_dir and remote_dir != "/":
                    try:
                        ftp.cwd(remote_dir)
                    except ftplib.error_perm:
                        print(f"  创建远程目录: {remote_dir}")
                        ftp.mkd(remote_dir)
                        ftp.cwd(remote_dir)
                
                with open(filepath, "rb") as f:
                    ftp.storbinary(f"STOR {filename}", f)
                
                try:
                    remote_size = ftp.size(filename)
                    if remote_size is not None and remote_size != file_size:
                        raise FileTransferError(
                            f"文件大小不匹配: 本地={file_size}, 远程={remote_size}"
                        )
                except FileTransferError:
                    raise
                except Exception:
                    pass
                
                ftp.quit()
                print(f"  ✅ FTP上传成功: {filename} -> {host}:{remote_dir}")
                return True
                
            except socket.timeout:
                error_msg = "连接超时"
                print(f"  ⚠️  {error_msg}")
            except ConnectionRefusedError:
                error_msg = "连接被拒绝"
                print(f"  ⚠️  {error_msg}")
            except ftplib.error_perm as e:
                if str(e).startswith("530"):
                    error_msg = "认证失败: 用户名或密码错误"
                    print(f"  ❌ {error_msg}")
                    return False
                elif str(e).startswith("550"):
                    error_msg = f"权限错误: {e}"
                    print(f"  ❌ {error_msg}")
                    return False
                else:
                    error_msg = f"FTP错误: {e}"
                    print(f"  ⚠️  {error_msg}")
            except FileTransferError as e:
                error_msg = str(e)
                print(f"  ⚠️  {error_msg}")
            except Exception as e:
                error_msg = f"上传失败: {e}"
                print(f"  ⚠️  {error_msg}")
            finally:
                if ftp:
                    try:
                        ftp.close()
                    except:
                        pass
            
            if attempt < max_retries:
                print(f"  {retry_delay}秒后重试...")
                import time
                time.sleep(retry_delay)
        
        print(f"  ❌ FTP上传失败，已重试 {max_retries} 次: {filename}")
        return False

    @staticmethod
    def upload_http(filepath: str, url: str, 
                    field_name: str = "file",
                    headers: Optional[Dict[str, str]] = None,
                    data: Optional[Dict[str, Any]] = None,
                    timeout: int = 30,
                    max_retries: int = 3,
                    retry_delay: int = 2) -> bool:
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"文件不存在: {filepath}")
        
        filename = os.path.basename(filepath)
        file_size = os.path.getsize(filepath)
        
        for attempt in range(1, max_retries + 1):
            try:
                print(f"HTTP上传 [{attempt}/{max_retries}]: {filename} ({file_size} bytes)")
                
                with open(filepath, "rb") as f:
                    files = {field_name: (filename, f, "application/octet-stream")}
                    response = requests.post(
                        url,
                        files=files,
                        headers=headers,
                        data=data,
                        timeout=timeout
                    )
                    response.raise_for_status()
                
                print(f"  ✅ HTTP上传成功: {filename} -> {url}")
                print(f"     状态码: {response.status_code}")
                if response.text:
                    preview = response.text[:150].replace('\n', ' ')
                    print(f"     响应: {preview}...")
                return True
                
            except requests.exceptions.Timeout:
                error_msg = "请求超时"
                print(f"  ⚠️  {error_msg}")
            except requests.exceptions.ConnectionError as e:
                error_msg = f"连接错误: {e}"
                print(f"  ⚠️  {error_msg}")
            except requests.exceptions.HTTPError as e:
                error_msg = f"HTTP错误: {e}"
                print(f"  ⚠️  {error_msg}")
                if hasattr(e, 'response') and e.response is not None:
                    print(f"     服务器响应: {e.response.status_code} - {e.response.text[:100]}")
                if e.response is not None and 400 <= e.response.status_code < 500:
                    return False
            except Exception as e:
                error_msg = f"上传失败: {e}"
                print(f"  ⚠️  {error_msg}")
            
            if attempt < max_retries:
                print(f"  {retry_delay}秒后重试...")
                import time
                time.sleep(retry_delay)
        
        print(f"  ❌ HTTP上传失败，已重试 {max_retries} 次: {filename}")
        return False

    @staticmethod
    def upload_file(filepath: str, config: Dict[str, Any]) -> bool:
        upload_type = config.get("type", "").lower()
        
        if upload_type == "ftp":
            return FileUploader.upload_ftp(
                filepath,
                host=config["host"],
                username=config.get("username", ""),
                password=config.get("password", ""),
                remote_dir=config.get("remote_dir", "/"),
                port=config.get("port", 21),
                use_tls=config.get("use_tls", False),
                max_retries=config.get("max_retries", 3),
                retry_delay=config.get("retry_delay", 2)
            )
        elif upload_type == "http":
            return FileUploader.upload_http(
                filepath,
                url=config["url"],
                field_name=config.get("field_name", "file"),
                headers=config.get("headers"),
                data=config.get("data"),
                timeout=config.get("timeout", 30),
                max_retries=config.get("max_retries", 3),
                retry_delay=config.get("retry_delay", 2)
            )
        else:
            print(f"❌ 不支持的上传类型: {upload_type}")
            return False
