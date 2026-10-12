const GlassOverlay = ({ title }: { title?: string }) => (
  <div style={{
    position: 'absolute',
    top: 20,
    left: 20,
    padding: '10px 20px',
    borderRadius: '12px',
    backdropFilter: 'blur(10px)',
    backgroundColor: 'rgba(0,0,0,0.4)',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 'bold'
  }}>
    📺 Now Playing: {title || '...'}
  </div>
);

export default GlassOverlay;
