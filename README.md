# Proyecto-TADW-1

## Instrucciones para probar el proyecto

1. Levanta los servicios con Docker Compose:
   docker-compose up
2. Abrir el navegador e ir a: http://localhost:3001/

Movies Microservice

Descripción

El microservicio Movies gestiona una API RESTful que permite trabajar con una base de datos MongoDB dockerizada para ofrecer información sobre películas. Este servicio es una pieza fundamental del sistema, ya que sirve como proveedor de datos para otros microservicios como Recommender y RandomMovies.

Características principales

	1.	API para listar películas: Permite obtener todas las películas almacenadas.
	2.	Búsqueda por título: Permite buscar una película específica por su título.
	3.	Filtrado por género: Proporciona películas que pertenecen a un género específico.
	4.	Integración con OMDB API (en caso de datos faltantes): Se valida la presencia del atributo poster en los datos; si falta, se intenta obtener esta información desde OMDB API.
	5.	Dockerizado: Listo para ejecutarse dentro de un contenedor Docker.

Endpoints de la API

	•	GET /movies: Retorna todas las películas en la base de datos.
	•	GET /movies/title/:title: Busca una película por su título.
	•	GET /movies/genre/:genre: Obtiene películas por género.



RandomMovies Microservice

Descripción

El microservicio RandomMovies proporciona una API RESTful para generar películas al azar. Este servicio interactúa con el microservicio Movies y valida la información de las películas, como los pósters. Además, ofrece películas de géneros específicos y una lista general de películas al azar. Este microservicio está dockerizado para facilitar su despliegue y administración.

Características principales

	1.	Películas aleatorias: Ofrece hasta 9 películas seleccionadas al azar de la base de datos del microservicio Movies.
	2.	Películas por género: Genera hasta 15 películas aleatorias por género (Horror, Adventure, Action, Drama, Comedy).
	3.	Validación de datos: Verifica si los pósters de las películas son válidos. Si no lo son, intenta actualizar los datos usando la API de OMDB.
	4.	Dockerizado: Listo para ejecutarse dentro de un contenedor Docker.

Endpoints de la API

	1.	GET /random-movies:
Devuelve hasta 9 películas seleccionadas al azar.
	
•	Respuesta exitosa: JSON con las películas al azar.

•	Error: Código 404 si no hay películas disponibles.
	2.	GET /random-movies-by-genres:
Devuelve hasta 15 películas al azar por género.

•	Géneros soportados: Horror, Adventure, Action, Drama, Comedy.

•	Respuesta exitosa: JSON con las películas agrupadas por género.

•	Error: Código 404 si no hay películas disponibles.


FrontEnd Microservice 

Este es el microservicio frontend de MovieLand, una aplicación web interactiva para explorar y visualizar películas recomendadas y de distintos géneros. El frontend se encarga de mostrar los carruseles de películas por género y de interactuar con el backend para obtener datos sobre las películas y registrar las visualizaciones de los usuarios.

Descripción

Este repositorio contiene el código fuente del microservicio frontend de MovieLand, que se encarga de la interfaz de usuario. En particular, el microservicio muestra:

•	Un carrusel interactivo con películas recomendadas obtenidas a partir del servicio de recomendación del backend.
	
•	Carruseles de películas por género (como Recomendadas, Horror, Aventura, Acción, Drama, Comedia).
	
•	Información detallada de cada película, como título, año, calificación y duración.
	
•	La capacidad de registrar las visualizaciones enviando clics de los usuarios a un microservicio de historial. Luego de realizar tres clicks, se obtienen las peliculas recomendadas por el microservicio recomendador para el usuario en base a las peliculas cliqueadas.

• Luego de ejecutar Docker-compose up, puede accederse al frontend a través de http://localhost:8080/index3.html 

Las cinco películas recomendadas se actualizan dinámicamente con base en las películas que el recomendador proporciona a través de la API del backend. 

Características

	•	Carruseles interactivos con películas por género y recomendadas.
	•	Actualización dinámica de las cinco películas recomendadas basadas en la respuesta del servicio de recomendación.
	•	Funcionalidad para registrar las visualizaciones enviando clics al microservicio de historial.
	•	Carga dinámica de películas desde el backend usando la API fetch.
	•	Interfaz moderna y responsiva utilizando Tailwind CSS y Flowbite.

Historial Microservice

Este es el microservicio Historial de MovieLand, que se encarga de registrar las visualizaciones de películas por parte de los usuarios. Recibe información sobre los clics realizados en las películas y la procesa mediante RabbitMQ para su posterior análisis por el recomendador.

Descripción

Este repositorio contiene el código fuente del microservicio de historial de MovieLand, que tiene la siguiente funcionalidad principal:

•	Recibe clics de películas a través de una API REST.

•	Almacena la cantidad de clics de cada película de manera temporal en memoria.

•	Envia estos clics a una cola de RabbitMQ para su procesamiento posterior, asegurando que los datos sean persistentes.

Cada vez que un usuario hace clic en una película, el microservicio incrementa un contador para esa película y envía un mensaje a la cola de RabbitMQ con el ID de la película y el número de clics.

Características

•	Recibe solicitudes POST con el ID de una película y registra el clic.

•	Envia los clics registrados a una cola en RabbitMQ para su procesamiento posterior.

•	Utiliza RabbitMQ como sistema de mensajería para asegurar que los clics sean procesados de manera asíncrona y eficiente.

•	El microservicio está basado en Express.js y utiliza Body-Parser para procesar datos JSON.

Recomendador Microservice

Este microservicio Recomendador es parte de la plataforma MovieLand, y se encarga de generar recomendaciones personalizadas de películas en base a las últimas tres películas cliqueadas por el usuario. Utiliza un sistema de puntuación que combina la similitud de tramas, géneros y puntuaciones para generar las mejores recomendaciones posibles.

Descripción

Este repositorio contiene el código fuente del microservicio Recomendador, que proporciona recomendaciones de películas mediante la siguiente lógica:

1.	Recibe la información sobre las últimas tres películas cliqueadas por el usuario desde una cola de RabbitMQ.

2.	Obtiene los datos completos de las películas desde el microservicio Movies, el cual proporciona información detallada de todas las películas disponibles, como su título, géneros, clasificación en IMDb, duración, año de estreno, y la trama.

3.	Calcula la similitud entre las tramas de las películas cliqueadas y todas las demás películas disponibles, utilizando el método de similitud coseno.

4.	Calcula un puntaje combinado  basado en:

•	Géneros de las películas
•	Puntuación de IMDb
•	Similitud de tramas

5.	Devuelve las 5 mejores recomendaciones de películas basadas en los puntajes calculados.

El microservicio también obtiene información adicional de la API externa OMDb API para completar los detalles faltantes, como el póster, año y duración de las películas.

Características

	•	Cálculo de similitud de tramas: Utiliza el vectorizador TF-IDF para encontrar películas con tramas similares.
	•	Recomendación basada en géneros y puntuación: Calcula el puntaje de recomendación basado en los géneros más populares entre las películas cliqueadas y la puntuación de IMDb.
	•	Integración con RabbitMQ: Recibe las películas cliqueadas desde RabbitMQ y procesa la información de manera eficiente.
	•	Obtención de datos completos desde el microservicio Movies: Obtiene los atributos completos de todas las películas (como título, géneros, duración, trama) desde el microservicio MUBIS, asegurando que se disponga de la información más precisa y actualizada.
	•	Obtención de datos completos desde OMDb API: Utiliza la API de OMDb para completar detalles faltantes, como el póster, año y duración de las películas.

 
