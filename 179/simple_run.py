import sys
import os
sys.path.insert(0, '/Users/mac/code/solo coder/179')
os.chdir('/Users/mac/code/solo coder/179')

from install_deps import main as install_main
install_result = install_main()
print(f"安装结果: {install_result}")

from verify_all import main as verify_main
verify_result = verify_main()
print(f"验证结果: {verify_result}")
