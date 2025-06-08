# Doc Info Extraction

This is a Document info extraction pipeline. The idea is to store the different schema with a unique ID. The Backend will take a "SchemaID" and the document (JPG, PNG, PDF) and extract the information from it. This information will be stored in a database. The Frontend will allow users to upload documents and view the extracted information. This project is built using FastAPI for the backend and NextJS for the frontend.

This extracts certain parameters for a given medical report and predicts if dialysis is required or not based on the extracted parameters.     

---------------------------------------------------------------------------------------------------

## [Demo](https://drive.google.com/file/d/1Ne0pWPFtf5iyXvgxjACvt45uMgTgPx07/view?usp=sharing)

---------------------------------------------------------------------------------------------------

## More info

- There are a few medical reports that can be used to test the application. It is available at `reports/`

## Tech Stack

### Backend

- [Python 3.x](https://www.python.org/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [SQLAlchemy](https://docs.sqlalchemy.org/en/14/index.html)
- [MongoDB](https://www.mongodb.com/)

### Frontend

- [NextJS 15.x](https://nextjs.org/)
- [React 19.x](https://reactjs.org/)
- [ShadCN](https://ui.shadcn.com/)
- [TailwindCSS](https://tailwindcss.com/)

## API Keys

- The user needs to create an API key on Mistral and Groq to use the document extraction functionality.

## How to run the project locally

### Running the Backend

```shell
cd ./backend/
uv sync
uv run fastapi dev
```

### Running the Frontend

```shell
cd frontend/
npm install
npm run dev
```

#### Generating a projectID

- Open Docs. 
- Make a POST request to `/projectID` with the following body:

```json
{
  "name": "Dialysis Proj Detection",
  "fields": [
    {
      "name": "serumCreatinine",
      "description": "Extract the serumCreatinine parameter with units",
      "data_type": "str"
    },
    {
      "name": "urea",
      "description": "Extract the urea parameter with units",
      "data_type": "str"
    },
    {
      "name": "potassium",
      "description": "Extract the potassium parameter with units",
      "data_type": "str"
    },
    {
      "name": "bicarbonate",
      "description": "Extract the bicarbonate parameter with units",
      "data_type": "str"
    },
    {
      "name": "phosphorous",
      "description": "Extract the phosphorous parameter with units",
      "data_type": "str"
    },
    {
      "name": "urineProtein",
      "description": "Extract the urineProtein parameter with units",
      "data_type": "str"
    },
    {
      "name": "sodium",
      "description": "Extract the sodium parameter with units",
      "data_type": "str"
    },
    {
      "name": "calcium",
      "description": "Extract the calcium parameter with units",
      "data_type": "str"
    }
  ]
}
```
- This will return a `projectID` which you can use to upload documents and extract information. 
