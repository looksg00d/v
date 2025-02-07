import os
import subprocess

def run_command(command):
    try:
        result = subprocess.run(
            command,
            check=True,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        print(result.stdout)
    except subprocess.CalledProcessError as e:
        print("Ошибка при выполнении команды:")
        print(e.stderr)
        raise

def main():
    # Определяем директорию, где находится наш скрипт integrated_runner.py
    base_dir = os.path.dirname(os.path.abspath(__file__))

    # Абсолютный путь к telegram_parser.py (находится в папке scripts)
    telegram_parser_path = os.path.join(base_dir, "telegram_parser.py")
    
    # Абсолютный путь к r_alphageneratorservice.js,
    # так как файл находится в C:\Users\User\Desktop\wwww\towns\services\r_alphageneratorservice.js
    node_script_path = r"C:\Users\User\Desktop\wwww\towns\services\r_alphageneratorservice.js"
    
    print(f"Запуск {telegram_parser_path} с параметром --limit 10")
    run_command(["python", telegram_parser_path, "--limit", "10"])
    
    print(f"Запуск {node_script_path} через Node.js")
    run_command(["node", node_script_path])

if __name__ == "__main__":
    main() 