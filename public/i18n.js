// Языки интерфейса: русский (исходный), O'zbekcha, English.
// Интерфейс пишется по-русски, а переводчик подменяет готовые надписи на лету (MutationObserver),
// до того как браузер их нарисует. Контент уроков не трогаем — он на том языке, на котором написан.

export const LANGS = [['ru', 'Русский'], ['uz', "O'zbekcha"], ['en', 'English']];

// [русский, английский, узбекский]
const PHRASES = [
  ['Лайм', 'Lime', 'Laym'], ['Сакура', 'Sakura', 'Sakura'], ['Лаванда', 'Lavender', 'Lavanda'], ['Океан', 'Ocean', 'Okean'], ['Персик', 'Peach', 'Shaftoli'], ['Мята', 'Mint', 'Yalpiz'],
  ['Ошибка сети', 'Network error', 'Tarmoq xatosi'], ['Да', 'Yes', 'Ha'], ['Отмена', 'Cancel', 'Bekor qilish'],
  ['только что', 'just now', 'hozirgina'], ['Пока нет данных', 'No data yet', "Hozircha ma'lumot yo'q"],
  ['Реши тест — здесь появится карта твоих тем', 'Solve a test and your topic map will appear here', "Test yech — bu yerda mavzular xaritang paydo bo'ladi"],
  ['Путь', 'Path', "Yo'l"], ['Лига', 'League', 'Liga'], ['Прогресс', 'Progress', 'Natijalar'], ['Профиль', 'Profile', 'Profil'],
  ['Панель', 'Dashboard', 'Panel'], ['Группы', 'Groups', 'Guruhlar'], ['Тесты', 'Tests', 'Testlar'], ['Бот', 'Bot', 'Bot'],
  ['Без группы', 'No group', "Guruhsiz"], ['Почти готово!', 'Almost there!', 'Deyarli tayyor!'],
  ['Учитель скоро добавит тебя в группу — и тут появятся тесты.', 'Your teacher will add you to a group soon — then tests will appear here.', "Ustoz tez orada seni guruhga qo'shadi — shunda bu yerda testlar paydo bo'ladi."],
  ['Твой ID:', 'Your ID:', 'Sening ID:'], ['Обновить', 'Refresh', 'Yangilash'],
  ['Пока тихо… Как только учитель отправит тест — я тебя позову!', "It's quiet for now… As soon as the teacher sends a test, I'll call you!", "Hozircha jim… Ustoz test yuborishi bilan seni chaqiraman!"],
  ['Все тесты пройдены! Ты просто космос. Можешь улучшить результат в любом уроке.', "All tests done! You're a star. You can improve your score in any lesson.", "Barcha testlar topshirildi! Sen zo'rsan. Istalgan darsda natijangni yaxshilashing mumkin."],
  ['К обучалке', 'To the lesson', "Darsga o'tish"], ['Начать', 'Start', 'Boshlash'],
  ['Работа над ошибками', 'Fix your mistakes', 'Xatolar ustida ishlash'],
  ['исправления. Ответишь верно — уйдут из списка.', 'to fix. Answer correctly and they leave the list.', "tuzatilishini kutmoqda. To'g'ri javob bersang, ro'yxatdan chiqadi."],
  ['сделано специально для тебя', 'made just for you', 'aynan sen uchun'], ['Личные задания', 'Personal tasks', 'Shaxsiy topshiriqlar'],
  ['Лента группы', 'Group feed', 'Guruh lentasi'], ['УЧИМСЯ', 'LEARN', "O'RGANAMIZ"], ['СТАРТ', 'START', 'START'],
  ['Обучалка', 'Lesson', 'Dars'], ['после обучалки', 'after the lesson', 'darsdan keyin'],
  ['потренировался в', 'practiced', 'mashq qildi:'], ['прошёл', 'completed', 'topshirdi:'],
  ['после каждого — мини-проверка', 'a mini-check after each', 'har biridan keyin mini-tekshiruv'],
  ['Повторить обучалку', 'Repeat the lesson', 'Darsni takrorlash'], ['Начать обучалку', 'Start the lesson', 'Darsni boshlash'],
  ['Хочешь повторить тему? Отличная идея — повторение мать учения!', 'Want to review the topic? Great idea — practice makes perfect!', "Mavzuni takrorlamoqchimisan? Zo'r fikr — takrorlash bilim onasi!"],
  ['Сначала я объясню тему по шагам, как на уроке. После каждого раздела — пара вопросов. А потом откроется тест!', "First I'll explain the topic step by step, like in class. A couple of questions after each section. Then the test unlocks!", "Avval mavzuni darsdagidek bosqichma-bosqich tushuntiraman. Har bo'limdan keyin bir-ikki savol. Keyin test ochiladi!"],
  ['Тест пока закрыт', 'The test is locked for now', 'Test hozircha yopiq'],
  ['Сначала пройди обучалку — я всё объясню, и тест покажется лёгким!', "Finish the lesson first — I'll explain everything and the test will feel easy!", "Avval darsni o'tib chiq — hammasini tushuntiraman va test oson tuyuladi!"],
  ['лучший', 'best', 'eng yaxshi'],
  ['Повторное прохождение — тренировка: XP не начисляется, но лучший результат обновится.', "Retaking is practice: no XP, but your best score will update.", "Qayta topshirish — mashq: XP berilmaydi, lekin eng yaxshi natija yangilanadi."],
  ['Правильные ответы подряд дают комбо: ×2 и ×3 XP', 'Correct answers in a row give a combo: ×2 and ×3 XP', "Ketma-ket to'g'ri javoblar kombo beradi: ×2 va ×3 XP"],
  ['Пройти ещё раз', 'Try again', 'Yana topshirish'], ['Лига недоступна', 'League unavailable', 'Liga mavjud emas'],
  ['Сначала учитель добавит тебя в группу.', 'First the teacher will add you to a group.', "Avval ustoz seni guruhga qo'shadi."],
  ['Лига группы', 'Group league', 'Guruh ligasi'], ['Учитель · ведёт группу', 'Teacher · leads the group', 'Ustoz · guruh rahbari'],
  ['Пока никто не решал тесты', 'Nobody has taken tests yet', 'Hali hech kim test yechmagan'], ['зона лидеров', 'leaders zone', 'yetakchilar zonasi'],
  ['Реши первый тест — и тут появится твой уровень', 'Take your first test and your level will appear here', "Birinchi testni yech — bu yerda darajang paydo bo'ladi"],
  ['Отличный уровень! Так держать', 'Great level! Keep it up', "Ajoyib daraja! Shunday davom et"],
  ['Хорошо, есть куда расти', "Good, there's room to grow", "Yaxshi, o'sish uchun joy bor"],
  ['Нужно подтянуть темы — у тебя получится', "Some topics need work — you've got this", "Mavzularni mustahkamlash kerak — uddalaysan"],
  ['успеваемость', 'performance', "o'zlashtirish"], ['опыта (XP)', 'experience (XP)', 'tajriba (XP)'], ['дней подряд', 'days in a row', 'kun ketma-ket'],
  ['лучшее комбо', 'best combo', 'eng yaxshi kombo'], ['тестов сдано', 'tests passed', 'test topshirildi'],
  ['Ты', 'You', 'Sen'], ['Ученик', 'Student', "O'quvchi"], ['Среднее по группе', 'Group average', "Guruh o'rtachasi"],
  ['Карта тем', 'Topic map', 'Mavzular xaritasi'], ['Мои ошибки', 'My mistakes', 'Mening xatolarim'], ['Ошибки ученика', "Student's mistakes", "O'quvchi xatolari"],
  ['Ошибок нет — всё исправлено!', 'No mistakes — all fixed!', "Xato yo'q — hammasi tuzatildi!"], ['Сейчас ошибок нет', 'No mistakes right now', "Hozir xato yo'q"],
  ['Слабые темы:', 'Weak topics:', 'Zaif mavzular:'], ['Исправить ошибки', 'Fix mistakes', 'Xatolarni tuzatish'],
  ['Ты vs группа', 'You vs group', 'Sen va guruh'], ['Ученик vs группа', 'Student vs group', "O'quvchi va guruh"],
  ['Твой результат', 'Your result', 'Sening natijang'], ['Его результат', 'Their result', 'Uning natijasi'], ['Группа', 'Group', 'Guruh'],
  ['Пока нет решённых тестов', 'No tests taken yet', "Hali yechilgan test yo'q"],
  ['Напарник', 'Buddy', 'Hamroh'], ['Цвет приложения', 'App color', 'Ilova rangi'], ['Тема', 'Theme', 'Mavzu'], ['Язык', 'Language', 'Til'],
  ['Авто', 'Auto', 'Avto'], ['Светлая', 'Light', "Yorug'"], ['Тёмная', 'Dark', "Qorong'i"],
  ['Выбери напарника!', 'Pick your buddy!', 'Hamrohingni tanla!'], ['Внешний вид', 'Appearance', "Ko'rinish"],
  ['Он будет болеть за тебя на каждом тесте. Поменять можно в профиле.', "They'll cheer for you on every test. You can change it in your profile.", "U har bir testda sen uchun qayg'uradi. Profilda o'zgartirish mumkin."],
  ['Напарник, цвет и тема', 'Buddy, color and theme', 'Hamroh, rang va mavzu'], ['Напарник, цвет, тема и язык', 'Buddy, color, theme and language', 'Hamroh, rang, mavzu va til'], ['Готово', 'Done', 'Tayyor'],
  ['Достижения', 'Achievements', 'Yutuqlar'], ['Как это работает', 'How it works', 'Bu qanday ishlaydi'],
  ['Уровень', 'Level', 'Daraja'], ['Звёзды', 'Stars', 'Yulduzlar'], ['серия', 'streak', 'seriya'], ['Серия', 'Streak', 'Seriya'],
  ['Моя статистика', 'My stats', 'Mening statistikam'], ['Прогресс, карта тем, сравнение с группой', 'Progress, topic map, comparison with the group', "Natijalar, mavzular xaritasi, guruh bilan solishtirish"],
  ['Твоё место среди одногруппников', 'Your place among classmates', "Guruhdoshlar orasidagi o'rning"], ['XP, уровни, серия и звёзды', 'XP, levels, streak and stars', 'XP, darajalar, seriya va yulduzlar'],
  ['Верно', 'True', "To'g'ri"], ['Неверно', 'False', "Noto'g'ri"],
  ['Выбери ответ', 'Choose the answer', 'Javobni tanla'], ['Верно или нет?', 'True or false?', "To'g'rimi yoki yo'q?"], ['Напиши ответ', 'Type the answer', 'Javobni yoz'],
  ['Собери ответ', 'Build the answer', "Javobni yig'"], ['Найди пары', 'Match the pairs', 'Juftlarni top'],
  ['Выйти из теста?', 'Leave the test?', 'Testdan chiqasanmi?'], ['Прогресс этой попытки не сохранится.', "This attempt's progress won't be saved.", 'Bu urinish saqlanmaydi.'],
  ['Выйти', 'Leave', 'Chiqish'], ['Закрыть', 'Close', 'Yopish'], ['Подсказка', 'Hint', 'Maslahat'], ['Проверить', 'Check', 'Tekshirish'],
  ['Отлично!', 'Great!', "A'lo!"], ['Супер!', 'Super!', 'Super!'], ['Так держать!', 'Keep it up!', 'Shunday davom et!'], ['В точку!', 'Spot on!', 'Aynan!'],
  ['Молодец!', 'Well done!', 'Barakalla!'], ['Блестяще!', 'Brilliant!', 'Ajoyib!'], ['Огонь!', 'Fire!', 'Zo\'r!'], ['Не совсем…', 'Not quite…', 'Unchalik emas…'],
  ['Правильно:', 'Correct answer:', "To'g'ri javob:"], ['Далее', 'Next', 'Keyingi'], ['Дальше', 'Next', 'Keyingi'],
  ['Повторим вопросы, где ты ошибся. На оценку это уже не влияет — просто закрепим.', "Let's repeat the questions you got wrong. It won't affect your score — just practice.", "Xato qilgan savollaringni takrorlaymiz. Bu bahoga ta'sir qilmaydi — shunchaki mustahkamlaymiz."],
  ['Поехали', "Let's go", 'Ketdik'], ['Все ошибки исправлены!', 'All mistakes fixed!', 'Barcha xatolar tuzatildi!'],
  ['Идеально!', 'Perfect!', 'Mukammal!'], ['Урок пройден!', 'Lesson complete!', "Dars o'tildi!"], ['Неплохо!', 'Not bad!', 'Yomon emas!'],
  ['В следующий раз получится', "You'll get it next time", 'Keyingi safar albatta uddalaysan'],
  ['Копилка ошибок пуста — красота!', 'Your mistake box is empty — beautiful!', "Xatolar qutisi bo'sh — zo'r!"],
  ['Ошибки попали в твою «Работу над ошибками» на главной', 'Your mistakes went to «Fix your mistakes» on the home screen', "Xatolaring bosh sahifadagi «Xatolar ustida ishlash»ga tushdi"],
  ['тренировка', 'practice', 'mashq'], ['превью', 'preview', "ko'rib chiqish"], ['Опыт', 'XP', 'Tajriba'], ['Комбо', 'Combo', 'Kombo'], ['Время', 'Time', 'Vaqt'],
  ['По темам', 'By topic', "Mavzular bo'yicha"], ['Ответы', 'Answers', 'Javoblar'], ['Продолжить', 'Continue', 'Davom etish'],
  ['Начнём!', "Let's start!", 'Boshladik!'], ['Идём дальше!', "Let's move on!", 'Davom etamiz!'],
  ['Теперь проверим, чему ты научился за эту секцию!', "Now let's check what you learned in this section!", "Endi bu bo'limda nimani o'rganganingni tekshiramiz!"],
  ['Выйти из обучалки?', 'Leave the lesson?', 'Darsdan chiqasanmi?'], ['Начнёшь заново в следующий раз.', "You'll start over next time.", 'Keyingi safar boshidan boshlaysan.'],
  ['Проверить себя', 'Check yourself', "O'zingni tekshir"], ['Верно!', 'Correct!', "To'g'ri!"], ['К тесту', 'To the test', "Testga o'tish"], ['Позже', 'Later', 'Keyinroq'],
  ['Создай группу и отправь первый тест', 'Create a group and send the first test', "Guruh yarat va birinchi testni yubor"],
  ['учеников', 'students', "o'quvchi"], ['групп', 'groups', 'guruh'], ['тестов отправлено', 'tests sent', 'test yuborildi'], ['средний балл', 'average score', "o'rtacha ball"],
  ['Новые ученики', 'New students', "Yangi o'quvchilar"], ['В группу', 'Add to group', "Guruhga"], ['Создать', 'Create', 'Yaratish'],
  ['Групп пока нет', 'No groups yet', "Hozircha guruh yo'q"], ['Создать первую группу', 'Create the first group', 'Birinchi guruhni yaratish'],
  ['Последние результаты', 'Latest results', "So'nggi natijalar"], ['чат привязан', 'chat linked', "chat ulangan"], ['чат не привязан', 'chat not linked', 'chat ulanmagan'],
  ['Добавить в группу', 'Add to group', "Guruhga qo'shish"], ['Новая группа', 'New group', 'Yangi guruh'], ['Добавлен в группу', 'Added to the group', "Guruhga qo'shildi"],
  ['Изменить группу', 'Edit group', 'Guruhni tahrirlash'], ['Название', 'Name', 'Nomi'], ['Например: Вечерняя группа', 'E.g.: Evening group', 'Masalan: Kechki guruh'],
  ['Иконка', 'Icon', 'Belgi'], ['Сохранить', 'Save', 'Saqlash'], ['Создать группу', 'Create group', 'Guruh yaratish'],
  ['Создай группу и добавь туда учеников. Ученики сначала запускают бота командой /start.', 'Create a group and add students. Students first start the bot with /start.', "Guruh yarat va o'quvchilarni qo'sh. O'quvchilar avval botni /start bilan ishga tushiradi."],
  ['Все ученики', 'All students', "Barcha o'quvchilar"], ['без группы', 'no group', 'guruhsiz'],
  ['Пока никто не запускал бота. Отправь ученикам ссылку на бота — после /start они появятся здесь.', "Nobody has started the bot yet. Send students the bot link — after /start they'll appear here.", "Hali hech kim botni ishga tushirmagan. O'quvchilarga bot havolasini yubor — /start dan keyin ular shu yerda paydo bo'ladi."],
  ['Ученики', 'Students', "O'quvchilar"], ['Статистика', 'Stats', 'Statistika'], ['Добавить учеников', 'Add students', "O'quvchi qo'shish"],
  ['Ошибок в копилке', 'Mistakes in the box', 'Qutidagi xatolar'], ['Убрать', 'Remove', "Olib tashlash"], ['В группе пока нет учеников', 'No students in the group yet', "Guruhda hali o'quvchi yo'q"],
  ['Тестов ещё не было', 'No tests yet', "Hali test bo'lmagan"], ['Отправь группе тест во вкладке «Тесты».', 'Send the group a test in the «Tests» tab.', "Guruhga «Testlar» bo'limidan test yubor."],
  ['Средний балл по тестам', 'Average score by test', "Testlar bo'yicha o'rtacha ball"], ['Карта группы', 'Group map', 'Guruh xaritasi'], ['Ср.', 'Avg', "O'rt."],
  ['не сдал', 'not taken', 'topshirmagan'], ['ниже 50%', 'below 50%', '50% dan past'], ['Нет учеников', 'No students', "O'quvchi yo'q"],
  ['Самые сложные вопросы', 'Hardest questions', 'Eng qiyin savollar'], ['Кто ещё не сдал', "Who hasn't taken it yet", 'Kim hali topshirmagan'], ['Все сдали', 'Everyone passed', 'Hamma topshirdi'],
  ['Назад', 'Back', 'Orqaga'], ['Изменить', 'Edit', 'Tahrirlash'], ['Удалить', 'Delete', "O'chirish"],
  ['Чат не привязан.', 'Chat not linked.', 'Chat ulanmagan.'], ['Добавь бота в Telegram-группу и напиши там', 'Add the bot to a Telegram group and type', "Botni Telegram-guruhga qo'sh va u yerda yoz"],
  ['Пока бот пишет ученикам в личку.', 'For now the bot messages students privately.', "Hozircha bot o'quvchilarga shaxsiy yozadi."],
  ['Ученики останутся, но отправленные этой группе тесты и их результаты пропадут из статистики.', 'Students stay, but tests sent to this group and their results will disappear from the stats.', "O'quvchilar qoladi, lekin bu guruhga yuborilgan testlar va natijalar statistikadan yo'qoladi."],
  ['Группа удалена', 'Group deleted', "Guruh o'chirildi"], ['Убрать из группы?', 'Remove from the group?', 'Guruhdan chiqarilsinmi?'],
  ['Ученики, которые уже запускали бота:', 'Students who already started the bot:', "Botni allaqachon ishga tushirgan o'quvchilar:"],
  ['уже в другой группе', 'already in another group', 'boshqa guruhda'], ['Все, кто запускал бота, уже в этой группе.', 'Everyone who started the bot is already in this group.', "Botni ishga tushirganlarning hammasi shu guruhda."],
  ['…или по @username / Telegram ID', '…or by @username / Telegram ID', '…yoki @username / Telegram ID orqali'], ['@username или 123456789', '@username or 123456789', '@username yoki 123456789'],
  ['Добавить', 'Add', "Qo'shish"], ['Добавлено', 'Added', "Qo'shildi"],
  ['выбор', 'choice', 'tanlash'], ['верно/неверно', 'true/false', "to'g'ri/noto'g'ri"], ['ввод', 'input', 'kiritish'], ['порядок', 'order', 'tartib'], ['пары', 'pairs', 'juftlar'],
  ['Как появляются тесты:', 'How tests appear:', 'Testlar qanday paydo bo\'ladi:'],
  ['Тестов пока нет', 'No tests yet', "Hozircha test yo'q"], ['Жду конспект — пришли его Claude.', 'Waiting for lesson notes — send them to Claude.', "Konspekt kutyapman — uni Claude'ga yubor."],
  ['Удалить черновик?', 'Delete the draft?', "Qoralama o'chirilsinmi?"], ['черновик', 'draft', 'qoralama'], ['Темы:', 'Topics:', 'Mavzular:'],
  ['тест не сдан', 'test not taken', 'test topshirilmagan'], ['Превью', 'Preview', "Ko'rish"], ['Отправить', 'Send', 'Yuborish'],
  ['Сначала создай группу', 'Create a group first', 'Avval guruh yarat'], ['Тест отправляется группе. Групп пока нет.', "Tests are sent to a group. There are no groups yet.", "Test guruhga yuboriladi. Hozircha guruh yo'q."],
  ['Отправить тест', 'Send the test', 'Testni yuborish'], ['Какой группе?', 'To which group?', 'Qaysi guruhga?'], ['уже отправлен', 'already sent', 'allaqachon yuborilgan'],
  ['Напоминать, пока все не сдадут', 'Remind until everyone passes', 'Hamma topshirguncha eslatish'], ['Нет', 'No', "Yo'q"],
  ['Текст напоминания', 'Reminder text', 'Eslatma matni'], ['Тест отправлен', 'Test sent', 'Test yuborildi'], ['среднее', 'average', "o'rtacha"],
  ['Рейтинг', 'Ranking', 'Reyting'], ['По вопросам (1-я попытка)', 'By question (1st attempt)', "Savollar bo'yicha (1-urinish)"],
  ['Отозвать тест у группы', 'Withdraw the test from the group', 'Testni guruhdan qaytarib olish'], ['Отозвать тест?', 'Withdraw the test?', 'Test qaytarib olinsinmi?'],
  ['Ученики перестанут его видеть, результаты по нему удалятся из статистики группы.', "Students won't see it anymore, its results will be removed from group stats.", "O'quvchilar uni ko'rmaydi, natijalari guruh statistikasidan o'chadi."],
  ['Отозвать', 'Withdraw', 'Qaytarib olish'], ['Отчёт для Claude', 'Report for Claude', 'Claude uchun hisobot'],
  ['Отправляет Claude результаты всех учеников: оценки, ошибки, что ответили и что было правильно. По ним Claude сделает каждому личную обучалку и тест по его ошибкам.', "Sends Claude all students' results: scores, mistakes, what they answered and what was correct. Claude will then make each student a personal lesson and test on their mistakes.", "Claude'ga barcha o'quvchilar natijalarini yuboradi: baholar, xatolar, nima javob berdi va nima to'g'ri edi. Shular asosida Claude har biriga xatolari bo'yicha shaxsiy dars va test tayyorlaydi."],
  ['Отправить отчёт Claude', 'Send report to Claude', "Claude'ga hisobot yuborish"], ['Подключить чат группы', 'Connect a group chat', 'Guruh chatini ulash'],
  ['Создай Telegram-группу (или открой существующую) и добавь туда бота.', 'Create a Telegram group (or open an existing one) and add the bot.', "Telegram-guruh yarat (yoki mavjudini och) va botni qo'sh."],
  ['Напиши в этой группе', 'In that group type', 'Shu guruhda yoz'], ['и выбери группу курса.', 'and pick the course group.', 'va kurs guruhini tanla.'],
  ['Готово: бот будет писать туда о новых тестах и напоминания. Без чата бот пишет ученикам в личку.', 'Done: the bot will post new tests and reminders there. Without a chat the bot messages students privately.', "Tayyor: bot u yerga yangi testlar va eslatmalarni yozadi. Chat bo'lmasa, bot o'quvchilarga shaxsiy yozadi."],
  ['Написать сейчас', 'Post now', 'Hozir yozish'], ['Например: Ребята, завтра урок в 18:00! Не забудьте решить тест', "E.g.: Guys, class tomorrow at 18:00! Don't forget the test", "Masalan: Bolalar, ertaga dars 18:00 da! Testni yechishni unutmang"],
  ['Отправить от бота', 'Send from the bot', 'Bot nomidan yuborish'], ['Новое напоминание', 'New reminder', 'Yangi eslatma'],
  ['Про какой тест (бот покажет, кто ещё не сдал, и сам остановится, когда сдадут все)', "Which test (the bot will show who hasn't passed and stop when everyone has)", "Qaysi test (bot kim topshirmaganini ko'rsatadi va hamma topshirganda to'xtaydi)"],
  ['Что писать', 'Message', 'Nima yozish'], ['Заходите и решайте тест!', 'Come and take the test!', 'Kiring va testni yeching!'], ['Как часто', 'How often', 'Qanchalik tez-tez'],
  ['Сколько раз максимум', 'Maximum times', 'Eng ko\'pi bilan necha marta'], ['Запустить напоминание', 'Start reminder', 'Eslatmani ishga tushirish'],
  ['Сначала создай группу во вкладке «Группы».', 'First create a group in the «Groups» tab.', "Avval «Guruhlar» bo'limida guruh yarat."],
  ['Напоминания', 'Reminders', 'Eslatmalar'], ['активно', 'active', 'faol'], ['пауза', 'paused', "to'xtatilgan"], ['Пауза', 'Pause', "To'xtatish"], ['Возобновить', 'Resume', 'Davom ettirish'],
  ['Напоминаний нет', 'No reminders', "Eslatma yo'q"], ['Отчёт отправлен', 'Report sent', 'Hisobot yuborildi'], ['Отправлено', 'Sent', 'Yuborildi'],
  ['Не удалось: привяжи чат или попроси учеников запустить бота', 'Failed: link a chat or ask students to start the bot', "Bo'lmadi: chatni ula yoki o'quvchilardan botni ishga tushirishni so'ra"],
  ['— просто сообщение, без теста —', '— just a message, no test —', '— oddiy xabar, testsiz —'],
  ['Напоминание запущено — первое уйдёт в течение минуты', 'Reminder started — the first one goes out within a minute', 'Eslatma ishga tushdi — birinchisi bir daqiqa ichida ketadi'],
  ['Не получилось войти', "Couldn't sign in", 'Kirib bo\'lmadi'], ['Открой приложение через бота в Telegram.', 'Open the app through the bot in Telegram.', 'Ilovani Telegramdagi bot orqali och.'],
  ['пришли конспект урока Claude — он сделает тест в стиле Duolingo. Тест появится здесь черновиком. Ученики его не видят, пока ты не нажмёшь «Отправить».', "send lesson notes to Claude — it will make a Duolingo-style test. It appears here as a draft. Students won't see it until you tap «Send».", "dars konspektini Claude'ga yubor — u Duolingo uslubida test tayyorlaydi. Test bu yerda qoralama bo'lib chiqadi. «Yuborish»ni bosmaguningcha o'quvchilar uni ko'rmaydi."],
  ['В Зубрике с', 'In Zubrik since', 'Zubrikda:'], ['тест', 'test', 'test'], ['теста', 'tests', 'test'], ['тестов', 'tests', 'test'],
  ['Учись в стиле игры: обучалки, тесты, лига группы', 'Learn like a game: lessons, tests, group league', "O'yindek o'rgan: darslar, testlar, guruh ligasi"],
  ['Почта', 'Email', 'Pochta'], ['Пароль', 'Password', 'Parol'], ['Войти', 'Sign in', 'Kirish'], ['Есть Telegram? Открой бота', 'Have Telegram? Open the bot', 'Telegram bormi? Botni och'],
  ['— там всё то же самое.', '— everything is the same there.', '— u yerda ham hammasi bir xil.'], ['Неверная почта или пароль', 'Wrong email or password', "Pochta yoki parol noto'g'ri"],
  ['Сессия истекла — войди ещё раз', 'Session expired — sign in again', 'Sessiya tugadi — qaytadan kir'], ['Слишком много попыток — подожди 10 минут', 'Too many attempts — wait 10 minutes', "Juda ko'p urinish — 10 daqiqa kut"],
  ['Учитель', 'Teacher', 'Ustoz'], ['говорил:', 'said:', 'aytgan edi:'], ['Раздел', 'Section', "Bo'lim"],
  ['Мими', 'Mimi', 'Mimi'], ['Капи', 'Kapi', 'Kapi'], ['Дино', 'Dino', 'Dino'], ['Акси', 'Axi', 'Aksi'], ['Бу', 'Boo', 'Bu'], ['Ано', 'Ano', 'Ano'], ['Зип', 'Zip', 'Zip'], ['Супербыстрый. Решает тесты быстрее молнии', 'Super fast. Solves tests faster than lightning', 'Juda tezkor. Testlarni chaqmoqdan tez yechadi'], ['ты', 'you', 'sen'], ['Лично', 'Personal', 'Shaxsiy'], ['лично', 'personal', 'shaxsiy'],
  ['Получено', 'Earned', 'Olingan'], ['Привязано!', 'Linked!', 'Ulandi!'],
  // достижения (приходят с сервера)
  ['Первый шаг', 'First step', 'Birinchi qadam'], ['Пройди первый тест', 'Pass your first test', 'Birinchi testni topshir'], ['Пятёрка', 'High five', 'Beshlik'],
  ['Пройди 5 тестов', 'Pass 5 tests', '5 ta testni topshir'], ['Сдай тест на 100%', 'Score 100% on a test', 'Testni 100% ga topshir'],
  ['Комбо-мастер', 'Combo master', 'Kombo ustasi'], ['Ответь правильно 5 раз подряд', 'Answer correctly 5 times in a row', "Ketma-ket 5 marta to'g'ri javob ber"],
  ['В огне', 'On fire', 'Olovda'], ['Занимайся 3 дня подряд', 'Study 3 days in a row', "3 kun ketma-ket o'qi"], ['Чемпион', 'Champion', 'Chempion'],
  ['Стань №1 в лиге группы', 'Become #1 in the group league', 'Guruh ligasida 1-o\'rin ol'],
  // маскоты
  ['Котёнок-отличница. Обожает, когда всё на 100%', 'A top-student kitten. Loves everything at 100%', "A'lochi mushukcha. Hammasi 100% bo'lishini yaxshi ko'radi"],
  ['Капибара. Никогда не паникует, даже на контрольной', 'A capybara. Never panics, even on exams', 'Kapibara. Hech qachon vahimaga tushmaydi, hatto nazoratda ham'],
  ['Динозаврик. Маленький, но рычит на ошибки', 'A little dino. Small, but roars at mistakes', "Kichkina dinozavr. Kichik, lekin xatolarga o'kiradi"],
  ['Аксолотль. Отращивает знания, как жабры', 'An axolotl. Grows knowledge like gills', "Aksolotl. Bilimni jabralardek o'stiradi"],
  ['Призрак в капюшоне. Звонит спросить: «Ну что, решил тест?»', 'A hooded ghost. Calls to ask: «So, did you take the test?»', "Kapyushonli arvoh. «Xo'sh, testni yechdingmi?» deb qo'ng'iroq qiladi"],
  ['Хакер в маске. Взламывает любые задачи — честно', 'A masked hacker. Cracks any problem — honestly', "Niqobli xaker. Har qanday masalani yechadi — halol"],
  // ошибки сервера
  ['Сначала пройди обучалку — тест откроется после неё', 'Finish the lesson first — the test opens after it', "Avval darsni o'tib chiq — test undan keyin ochiladi"],
  ['Ошибок нет — ты всё исправил!', "No mistakes — you've fixed everything!", 'Xato yo\'q — hammasini tuzatding!'],
  ['Открой приложение через Telegram-бота', 'Open the app through the Telegram bot', 'Ilovani Telegram-bot orqali och'],
  ['Этот тест не для твоей группы', 'This test is not for your group', 'Bu test sening guruhing uchun emas'],
];

// Шаблоны с числами и именами: [regex, en, uz]
const NOUNS = [
  [/(\d+) (тест|теста|тестов)(?![а-яё])/gi, '$1 test(s)', '$1 ta test'],
  [/(\d+) (вопрос|вопроса|вопросов)(?![а-яё])/gi, '$1 question(s)', '$1 ta savol'],
  [/(\d+) (раздел|раздела|разделов)(?![а-яё])/gi, '$1 section(s)', "$1 ta bo'lim"],
  [/(\d+) (ученик|ученика|учеников)(?![а-яё])/gi, '$1 student(s)', "$1 ta o'quvchi"],
  [/(\d+) (день|дня|дней)(?![а-яё])/gi, '$1 day(s)', '$1 kun'],
  [/(\d+) (раз|раза)(?![а-яё])/gi, '$1 time(s)', '$1 marta'],
];
// Кусочки внутри смешанных строк (подменяются всегда)
const TOKENS = [
  [/\(ты\)/g, '(you)', '(sen)'],
  [/(^|[\s·])ср\. /g, '$1avg ', "$1o'rt. "],
  [/(\d+) мин(?![а-яё])/gi, '$1 min', '$1 daq'],
  [/(\d+) ч(?![а-яё])/gi, '$1 h', '$1 soat'],
  [/только что/g, 'just now', 'hozirgina'],
  [/обучалку (\d+\/\d+)/g, 'lesson $1', 'dars $1'],
  [/обучалка ✓/g, 'lesson ✓', 'dars ✓'],
  [/обучалка не пройдена/g, 'lesson not done', "dars o'tilmagan"],
  [/^обучалка · (\d+)$/g, 'lesson · $1', 'dars · $1'],
  [/тест (\d+\/\d+)/g, 'test $1', 'test $1'],
  [/тест не сдан/g, 'test not taken', 'test topshirilmagan'],
  [/\(сдали (\d+)\/(\d+)\)/g, '($1/$2 passed)', '($1/$2 topshirdi)'],
  [/сдали (\d+)\/(\d+)/g, '$1/$2 passed', '$1/$2 topshirdi'],
  [/^Темы: /g, 'Topics: ', 'Mavzular: '],
  [/^Лично: /g, 'Personal: ', 'Shaxsiy: '],
  [/(\d+)% верно/g, '$1% correct', "$1% to'g'ri"],
  [/^каждые /g, 'every ', 'har '],
  [/ · отправлено (\d+)\/(\d+)/g, ' · sent $1/$2', ' · yuborildi $1/$2'],
  [/ · следующее в /g, ' · next at ', ' · keyingisi '],
];

const PATTERNS = [
  [/^Привет, (.+)!$/, 'Hi, $1!', 'Salom, $1!'],
  [/^(\d+) из (\d+) пройдено$/, '$1 of $2 done', "$2 tadan $1 tasi o'tildi"],
  [/^(\d+) из (\d+)$/, '$1 of $2', '$2 tadan $1'],
  [/^(\d+) мин назад$/, '$1 min ago', '$1 daqiqa oldin'],
  [/^(\d+) ч назад$/, '$1 h ago', '$1 soat oldin'],
  [/^Тема «(.+)» ждёт! Сначала пройдём обучалку — я всё объясню, а потом проверим тестом\.$/, "«$1» is waiting! First we'll do the lesson — I'll explain everything, then a test.", "«$1» mavzusi kutmoqda! Avval darsni o'tamiz — hammasini tushuntiraman, keyin test."],
  [/^Тест «(.+)» уже ждёт тебя\. Погнали\?$/, "The test «$1» is waiting for you. Let's go?", '«$1» testi seni kutmoqda. Ketdikmi?'],
  [/^Серия (.+)! Не останавливайся — тест «(.+)» ждёт\.$/, "$1 streak! Don't stop — the test «$2» is waiting.", "$1 seriya! To'xtama — «$2» testi kutmoqda."],
  [/^Обучалка: (.+)$/, 'Lesson: $1', 'Dars: $1'],
  [/^Раздел (\d+)\. (.+)$/, 'Section $1. $2', "$1-bo'lim. $2"],
  [/^Учитель (.+) говорил:$/, 'Teacher $1said:'.replace('$1said', '$1 said'), 'Ustoz $1 aytgan edi:'],
  [/^Обучалка пройдена! (?:В проверках (\d+) из (\d+)\. )?Учитель (.+) будет доволен\. ?(Теперь — тест\. Ты готов!)?$/, (m, a, b, t, n) => `Lesson complete! ${a ? `Checks: ${a} of ${b}. ` : ''}Teacher ${t} will be proud. ${n ? "Now — the test. You're ready!" : ''}`, (m, a, b, t, n) => `Dars o'tildi! ${a ? `Tekshiruvlar: ${b} tadan ${a}. ` : ''}Ustoz ${t} xursand bo'ladi. ${n ? 'Endi — test. Sen tayyorsan!' : ''}`],
  [/^Исправлено (\d+) из (\d+)$/, 'Fixed $1 of $2', '$2 tadan $1 tasi tuzatildi'],
  [/^В копилке ошибок осталось (.+)$/, 'Mistakes left in the box: $1', 'Qutida qolgan xatolar: $1'],
  [/^Среднее по группе \(сдали (\d+) из (\d+)\)$/, 'Group average ($1 of $2 passed)', "Guruh o'rtachasi ($2 tadan $1 topshirdi)"],
  [/^Уровень (\d+)$/, 'Level $1', '$1-daraja'],
  [/^Получено (\d+) из (\d+)$/, 'Earned $1 of $2', '$2 tadan $1 olindi'],
  [/^(\d+) вопрос(?:а|ов)? ждут? исправления\. Ответишь верно — уйдут из списка\.$/, "$1 question(s) to fix. Answer correctly and they leave the list.", "$1 ta savol tuzatilishini kutmoqda. To'g'ri javob bersang, ro'yxatdan chiqadi."],
  [/^Добавить в «(.+)»$/, 'Add to «$1»', '«$1» ga qo\'shish'],
  [/^Удалить «(.+)»\?$/, 'Delete «$1»?', '«$1» o\'chirilsinmi?'],
  [/^Средний балл по курсу — (.+)$/, 'Course average — $1', "Kurs bo'yicha o'rtacha ball — $1"],
  [/^сдали (\d+)\/(\d+)$/, '$1/$2 passed', '$1/$2 topshirdi'],
  [/^Учеников в отчёте: (\d+)\.?$/, 'Students in the report: $1.', "Hisobotdagi o'quvchilar: $1."],
  [/^Не забудьте решить тест «(.+)»! 💪$/, "Don't forget to take the test «$1»! 💪", '«$1» testini yechishni unutmang! 💪'],
];

const DICT = { en: new Map(), uz: new Map() };
for (const [ru, en, uz] of PHRASES) { DICT.en.set(ru, en); DICT.uz.set(ru, uz); }
const LONG = PHRASES.filter(([ru]) => ru.length >= 14).sort((a, b) => b[0].length - a[0].length);

let lang = 'ru';
export const getLang = () => lang;

export function tr(text, l = lang) {
  if (l === 'ru' || !text || !/[А-Яа-яЁё]/.test(text)) return text;
  const li = l === 'en' ? 1 : 2;
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(text);
  const [, pre, core, post] = m;
  const exact = DICT[l].get(core);
  if (exact !== undefined) return pre + exact + post;
  for (const p of PATTERNS) if (p[0].test(core)) return pre + core.replace(p[0], p[li]) + post;
  let out = core;
  for (const row of LONG) if (out.includes(row[0])) out = out.split(row[0]).join(row[li]);
  for (const n of NOUNS) out = out.replace(n[0], n[li]);
  for (const n of TOKENS) out = out.replace(n[0], n[li]);
  return pre + out + post;
}

// ───────── автоматический перевод DOM ─────────
const SKIP = 'pre, code, .qprompt, .opt, .chip-w, .speech, .say-box, [data-noi18n], script, style, .heat td.nm';
const ATTRS = ['placeholder', 'title', 'aria-label'];
const done = new WeakMap(); // текстовый узел -> значение, которое мы туда записали

function translateNode(node) {
  if (lang === 'ru') return;
  if (node.nodeType === 3) {
    const p = node.parentElement;
    if (!p || p.closest(SKIP)) return;
    if (done.get(node) === node.data) return;
    const t = tr(node.data);
    if (t !== node.data) node.data = t;
    done.set(node, node.data);
    return;
  }
  if (node.nodeType !== 1 || node.matches(SKIP)) return;
  for (const a of ATTRS) {
    const v = node.getAttribute(a);
    if (v && /[А-Яа-яЁё]/.test(v)) node.setAttribute(a, tr(v));
  }
  if (node.tagName === 'INPUT' && node.type !== 'text' && node.value && /[А-Яа-яЁё]/.test(node.value) && node.closest('[data-remtext]')) node.value = tr(node.value);
  for (const c of node.childNodes) translateNode(c);
}

let observer = null;
export function setLang(l) {
  lang = ['ru', 'uz', 'en'].includes(l) ? l : 'ru';
  document.documentElement.lang = lang;
  if (!observer) {
    observer = new MutationObserver((muts) => {
      if (lang === 'ru') return;
      for (const m of muts) {
        if (m.type === 'characterData') translateNode(m.target);
        else m.addedNodes.forEach(translateNode);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  translateNode(document.body);
}

export function detectLang(tgLangCode) {
  const c = String(tgLangCode || navigator.language || 'ru').slice(0, 2).toLowerCase();
  return c === 'uz' ? 'uz' : c === 'en' ? 'en' : 'ru';
}
