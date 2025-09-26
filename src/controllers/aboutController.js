// Controller for About page
exports.getAbout = async (req, res) => {
  try {
    // Extract version from environment or use default
    const version = process.env.SITE_VERSION || '1.0.0';
    
    // Configuration from environment variables
    const config = {
      personName: process.env.ABOUT_PERSON_NAME || 'Bruno Silveira',
      personLinkedin: process.env.ABOUT_PERSON_LINKEDIN || '',
      personGithub: process.env.ABOUT_PERSON_GITHUB || '',
      doktaLinkedin: process.env.ABOUT_DOKTA_LINKEDIN || '',
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