// Controller for About page
exports.getAbout = async (req, res) => {
  try {
    // Extract version from environment or use default
    const version = process.env.SITE_VERSION || '1.0.0';
    
    const developers = [
      { name: 'Bruno', linkedin: '', github: '' },
      { name: 'Nahuel', linkedin: '', github: '' },
      { name: 'Enzo', linkedin: '', github: '' },
      { name: 'Alejandro', linkedin: '', github: '' },
      { name: 'Alexis', linkedin: '', github: '' }
    ];

    const config = {
      developers: developers
    };
    
    // Render the about page
    res.render('about', {
      title: 'Acerca de',
      version: version,
      config: config,
      isModular: true, // Flag to indicate this is running in modular mode
      darkMode: req.query.darkMode === 'true' // Add dark mode from URL parameter
    });
  } catch (error) {
    console.error('Error rendering about page:', error);
    res.status(500).json({
      error: 'Error al cargar la página',
      message: 'No se pudo cargar la información'
    });
  }
};