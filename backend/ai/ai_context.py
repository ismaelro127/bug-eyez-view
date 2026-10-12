_ai_memory = []

def get_ai_context():
    """Returns a simple AI memory context manager."""
    class AIContext:
        def add_entry(self, data):
            _ai_memory.append(data)

        def recent(self, n=5):
            return _ai_memory[-n:]

    return AIContext()
