from flask import Flask
from flask_cors import CORS

from api.routes import provenance_bp
from core.config import MAX_CONTENT_LENGTH
from repositories.provenance import init_db


def create_app():
    init_db()

    app = Flask(__name__)
    app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH
    CORS(app)
    app.register_blueprint(provenance_bp)
    return app


app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True) 