import json
import os
import subprocess
from datetime import datetime
import pandas as pd
from tabulate import tabulate
import logging
from logging.handlers import RotatingFileHandler

# Настройка логирования
def setup_logging():
    log_dir = 'logs'
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
        
    log_format = '%(asctime)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s'
    
    # Основной файл лога
    main_handler = RotatingFileHandler(
        os.path.join(log_dir, 'message_tracker.log'),
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    main_handler.setFormatter(logging.Formatter(log_format))
    
    # Отдельный файл для ошибок
    error_handler = RotatingFileHandler(
        os.path.join(log_dir, 'errors.log'),
        maxBytes=10*1024*1024,
        backupCount=5
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(logging.Formatter(log_format))
    
    # Консольный вывод
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(logging.Formatter('%(levelname)s: %(message)s'))

    # Настройка корневого логгера
    logging.root.setLevel(logging.DEBUG)
    logging.root.addHandler(main_handler)
    logging.root.addHandler(error_handler)
    logging.root.addHandler(console_handler)

class MessageTracker:
    def __init__(self):
        setup_logging()
        logging.info("Инициализация MessageTracker")
        
        self.base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.insights_dir = os.path.join(self.base_dir, 'crypto-chat', 'data', 'alpha_insights')
        self.profiles_file = os.path.join(self.base_dir, 'towns', 'profiles.json')
        self.messages_file = os.path.join(self.base_dir, 'towns', 'messages.csv')
        
        logging.debug(f"Base directory: {self.base_dir}")
        logging.debug(f"Insights directory: {self.insights_dir}")
        logging.debug(f"Profiles file: {self.profiles_file}")
        logging.debug(f"Messages file: {self.messages_file}")

        self._init_csv()

    def _init_csv(self):
        """Инициализация CSV файла с расширенными полями"""
        try:
            if not os.path.exists(self.messages_file):
                df = pd.DataFrame(columns=[
                    'timestamp',
                    'profile_id',
                    'type',
                    'content',
                    'insight_id',
                    'status',
                    'error',
                    'response_time',
                    'character_type'
                ])
                df.to_csv(self.messages_file, index=False)
                logging.info("Создан новый CSV файл для сообщений")
        except Exception as e:
            logging.error(f"Ошибка при инициализации CSV: {e}", exc_info=True)
            raise

    def run_discussion(self, insight_id):
        """Запуск обсуждения через run-discussion.js с расширенным логированием"""
        logging.info(f"Запуск обсуждения для инсайта {insight_id}")
        start_time = datetime.now()
        
        try:
            script_path = os.path.join(self.base_dir, 'towns', 'run-discussion.js')
            logging.debug(f"Путь к скрипту: {script_path}")
            
            process = subprocess.Popen(
                ['node', script_path, str(insight_id)],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Отслеживание stdout и stderr одновременно
            while True:
                stdout_line = process.stdout.readline()
                stderr_line = process.stderr.readline()
                
                if stdout_line == '' and stderr_line == '' and process.poll() is not None:
                    break
                    
                if stdout_line:
                    logging.info(f"Discussion output: {stdout_line.strip()}")
                    self.parse_output(stdout_line.strip(), insight_id, start_time)
                    
                if stderr_line:
                    logging.error(f"Discussion error: {stderr_line.strip()}")
                    self.save_message(
                        'system',
                        'error',
                        stderr_line.strip(),
                        insight_id,
                        status='error',
                        error=stderr_line.strip()
                    )

            return_code = process.poll()
            execution_time = (datetime.now() - start_time).total_seconds()
            logging.info(f"Обсуждение завершено за {execution_time} секунд с кодом {return_code}")
            
            return return_code == 0

        except Exception as e:
            logging.error("Критическая ошибка при запуске обсуждения", exc_info=True)
            self.save_message(
                'system',
                'error',
                str(e),
                insight_id,
                status='error',
                error=str(e)
            )
            return False

    def parse_output(self, output, insight_id, start_time):
        """Расширенный парсинг вывода"""
        try:
            response_time = (datetime.now() - start_time).total_seconds()
            
            if 'Загрузка инсайта' in output:
                logging.debug(f"Начало загрузки инсайта {insight_id}")
                
            elif 'Публикация инсайта...' in output:
                logging.info("Обнаружена публикация инсайта")
                self.save_message(
                    'profile1',
                    'insight',
                    output,
                    insight_id,
                    status='sent',
                    response_time=response_time
                )
                
            elif 'Генерация ответа от' in output:
                profile_info = output.split('от ')[1].split(' (')[0]
                character_type = output.split('(')[1].split(')')[0]
                logging.info(f"Обнаружена генерация ответа от {profile_info}")
                
                self.save_message(
                    profile_info,
                    'response',
                    output,
                    insight_id,
                    status='generating',
                    character_type=character_type,
                    response_time=response_time
                )
                
            elif 'Character object:' in output:
                logging.debug(f"Character object data: {output}")
                
            elif 'Публикация ответа...' in output:
                logging.info("Публикация ответа")
                
            elif 'Обсуждение успешно завершено!' in output:
                logging.info(f"Обсуждение для инсайта {insight_id} успешно завершено")
                
        except Exception as e:
            logging.error(f"Ошибка при парсинге вывода: {output}", exc_info=True)
            self.save_message(
                'system',
                'error',
                f"Parse error: {str(e)}",
                insight_id,
                status='error',
                error=str(e)
            )

    def save_message(self, profile_id, msg_type, content, insight_id, status='pending', error=None, response_time=None, character_type=None):
        """Расширенное сохранение сообщения"""
        try:
            new_row = {
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'profile_id': profile_id,
                'type': msg_type,
                'content': content,
                'insight_id': insight_id,
                'status': status,
                'error': error,
                'response_time': response_time,
                'character_type': character_type
            }
            
            logging.debug(f"Сохранение сообщения: {new_row}")
            
            df = pd.read_csv(self.messages_file)
            df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
            df.to_csv(self.messages_file, index=False)
            
            print("\nОбновленная история сообщений:")
            print(tabulate(df.tail(), headers='keys', tablefmt='grid', showindex=False))
            
        except Exception as e:
            logging.error("Ошибка при сохранении сообщения", exc_info=True)
            raise

def main():
    try:
        tracker = MessageTracker()
        
        import sys
        if len(sys.argv) < 2:
            logging.error("Не указан ID инсайта")
            print("Необходимо указать ID инсайта!")
            print("Пример: python message_tracker.py 331810")
            sys.exit(1)
        
        insight_id = sys.argv[1]
        logging.info(f"Начало обработки инсайта {insight_id}")
        
        if tracker.run_discussion(insight_id):
            logging.info("Обсуждение успешно завершено")
        else:
            logging.error("Ошибка при выполнении обсуждения")
            
    except Exception as e:
        logging.critical("Критическая ошибка в main()", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    main()