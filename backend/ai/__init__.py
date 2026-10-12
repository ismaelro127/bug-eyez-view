from flask import Blueprint
from .summarizer import summarizer_bp
from .entity_info import entity_bp
from .finance_info import finance_bp
from ai.entity_info import entity_bp


ai = Blueprint("ai", __name__)
ai.register_blueprint(summarizer_bp, url_prefix="/summarizer")
ai.register_blueprint(entity_bp, url_prefix="/entity")
ai.register_blueprint(finance_bp, url_prefix="/finance")
