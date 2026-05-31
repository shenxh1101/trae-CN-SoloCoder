import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from apscheduler.schedulers.background import BackgroundScheduler
from config import Config
from routes.chat_routes import chat_bp
from routes.admin_routes import admin_bp
from services.backup_service import BackupService

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    JWTManager(app)
    
    app.register_blueprint(chat_bp)
    app.register_blueprint(admin_bp)
    
    os.makedirs(Config.BACKUP_DIR, exist_ok=True)
    
    backup_service = BackupService()
    
    def scheduled_backup():
        print("Starting scheduled backup...")
        result = backup_service.create_backup()
        if result["success"]:
            cleanup_result = backup_service.cleanup_old_backups(keep_count=10)
            print(f"Backup completed: {result['backup_file']}")
            if cleanup_result["deleted_count"] > 0:
                print(f"Cleaned up {cleanup_result['deleted_count']} old backups")
        else:
            print(f"Backup failed: {result.get('error')}")
    
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        scheduled_backup,
        'interval',
        hours=Config.BACKUP_INTERVAL_HOURS,
        id='knowledge_backup'
    )
    scheduler.start()
    
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return {
            "success": True,
            "message": "AI法律咨询服务运行正常",
            "version": "1.0.0"
        }
    
    @app.errorhandler(404)
    def not_found(error):
        return {
            "success": False,
            "message": "API endpoint not found"
        }, 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return {
            "success": False,
            "message": "服务器内部错误"
        }, 500
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5001, debug=True)
