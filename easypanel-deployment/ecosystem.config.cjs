{
  "apps": [
    {
      "name": "excel-etl-app",
      "script": "./start.sh",
      "cwd": "./",
      "env": {
        "NODE_ENV": "production"
      },
      "error_file": "./logs/err.log",
      "out_file": "./logs/out.log",
      "log_file": "./logs/combined.log",
      "time": true
    }
  ]
}