/**
 * ZOMBIE SURVIVOR: LAST DAYS
 * Основной JavaScript файл игры
 * Версия 1.0 - Фаза 1 (Скелет игры)
 */

'use strict';

// ============================================
// ИГРОВОЕ СОСТОЯНИЕ
// ============================================
const gameState = {
    player: {
        name: '',
        age: 25,
        gender: 'male',
        backstory: '',
        health: 100,
        maxHealth: 100,
        hunger: 100, // 100 = сыт, 0 = голодает
        thirst: 100,
        stamina: 100,
        morale: 50,
        skills: { 
            combat: 0, 
            medicine: 0, 
            crafting: 0, 
            stealth: 0, 
            knowledge: 0,
            endurance: 0
        },
        injuries: [],
        location: 'unknown',
        hasDog: false
    },
    resources: {
        food: 0,
        water: 0,
        medicine: 0,
        ammo: 0,
        materials: 0,
        fuel: 0
    },
    inventory: [],
    day: 1,
    timeOfDay: 'morning', // morning, afternoon, evening, night
    location: null,
    npcs: [],
    log: [],
    flags: {}
};

// Константы времени суток
const TIME_PERIODS = {
    morning: { name: 'Утро', icon: '🌅', zombieChance: 1 },
    afternoon: { name: 'День', icon: '☀️', zombieChance: 1.2 },
    evening: { name: 'Вечер', icon: '🌇', zombieChance: 1.5 },
    night: { name: 'Ночь', icon: '🌙', zombieChance: 2 }
};

const PERIOD_KEYS = ['morning', 'afternoon', 'evening', 'night'];

// Данные предысторий
const BACKSTORIES = {
    loner: {
        name: 'Одиночка',
        icon: '🐕',
        skillBonus: 'stealth',
        startingItems: ['dog'],
        description: 'Вы предпочитали держаться в тени. Теперь это помогает вам выживать.'
    },
    soldier: {
        name: 'Военный',
        icon: '🔫',
        skillBonus: 'combat',
        startingItems: ['pistol', 'ammo_30'],
        description: 'Военная подготовка даёт преимущество в бою.'
    },
    medic: {
        name: 'Медик',
        icon: '💊',
        skillBonus: 'medicine',
        startingItems: ['medkit_3'],
        description: 'Медицинские знания спасают жизни.'
    },
    engineer: {
        name: 'Инженер',
        icon: '🔧',
        skillBonus: 'crafting',
        startingItems: ['tools'],
        description: 'Вы умеете чинить и создавать вещи из ничего.'
    },
    refugee: {
        name: 'Беженец',
        icon: '🎒',
        skillBonus: 'endurance',
        startingItems: ['backpack', 'food_5'],
        description: 'Вы привыкли к лишениям и долгому пути.'
    },
    scientist: {
        name: 'Учёный',
        icon: '📻',
        skillBonus: 'knowledge',
        startingItems: ['map', 'radio'],
        description: 'Ваши знания могут стать ключом к выживанию.'
    }
};

// ============================================
// СИСТЕМА СОХРАНЕНИЯ
// ============================================
const SaveSystem = {
    SAVE_KEY: 'zombie_survivor_save_v1',
    
    /**
     * Сохранение игры в localStorage
     */
    save() {
        try {
            const data = JSON.stringify(gameState);
            localStorage.setItem(this.SAVE_KEY, data);
            console.log('Игра сохранена');
        } catch (e) {
            console.error('Ошибка сохранения:', e);
        }
    },
    
    /**
     * Загрузка игры из localStorage
     */
    load() {
        try {
            const data = localStorage.getItem(this.SAVE_KEY);
            if (data) {
                const parsed = JSON.parse(data);
                // Объединяем с текущим состоянием на случай добавления новых полей
                Object.assign(gameState, parsed);
                console.log('Игра загружена');
                return true;
            }
        } catch (e) {
            console.error('Ошибка загрузки:', e);
        }
        return false;
    },
    
    /**
     * Проверка наличия сохранения
     */
    hasSave() {
        return localStorage.getItem(this.SAVE_KEY) !== null;
    },
    
    /**
     * Удаление сохранения
     */
    clear() {
        localStorage.removeItem(this.SAVE_KEY);
    }
};

// ============================================
// МЕНЕДЖЕР ЭКРАНОВ
// ============================================
const ScreenManager = {
    /**
     * Переключение на указанный экран
     */
    show(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    },
    
    /**
     * Показать модальное окно
     */
    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    },
    
    /**
     * Скрыть модальное окно
     */
    hideModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }
};

// ============================================
// UI МЕНЕДЖЕР
// ============================================
const UIManager = {
    /**
     * Обновление всех статус-баров
     */
    updateStatusBars() {
        const p = gameState.player;
        
        // Здоровье
        this.updateStatusBar('health', p.health, p.maxHealth);
        document.getElementById('health-value').textContent = `${p.health}/${p.maxHealth}`;
        
        // Голод
        this.updateStatusBar('hunger', p.hunger, 100);
        document.getElementById('hunger-value').textContent = p.hunger;
        
        // Жажда
        this.updateStatusBar('thirst', p.thirst, 100);
        document.getElementById('thirst-value').textContent = p.thirst;
        
        // Выносливость
        this.updateStatusBar('stamina', p.stamina, 100);
        document.getElementById('stamina-value').textContent = p.stamina;
        
        // Настроение
        this.updateStatusBar('morale', p.morale, 100);
        document.getElementById('morale-value').textContent = p.morale;
    },
    
    /**
     * Обновление конкретного статус-бара
     */
    updateStatusBar(type, current, max) {
        const bar = document.getElementById(`status-${type}`);
        const percentage = (current / max) * 100;
        bar.style.width = `${percentage}%`;
    },
    
    /**
     * Обновление информации о дне и времени
     */
    updateTimeInfo() {
        document.getElementById('day-display').textContent = `День ${gameState.day}`;
        const period = TIME_PERIODS[gameState.timeOfDay];
        document.getElementById('time-display').textContent = `${period.icon} ${period.name}`;
    },
    
    /**
     * Добавление записи в лог событий
     */
    addLogEntry(message) {
        gameState.log.unshift({
            day: gameState.day,
            period: gameState.timeOfDay,
            message: message,
            timestamp: Date.now()
        });
        
        // Ограничиваем лог последними 50 записями
        if (gameState.log.length > 50) {
            gameState.log.pop();
        }
        
        this.renderLog();
    },
    
    /**
     * Отрисовка лога событий
     */
    renderLog() {
        const container = document.getElementById('log-container');
        container.innerHTML = gameState.log.slice(0, 10).map(entry => {
            const period = TIME_PERIODS[entry.period];
            return `<div class="log-entry">
                <strong>День ${entry.day}, ${period.name}:</strong> ${entry.message}
            </div>`;
        }).join('');
    },
    
    /**
     * Обновление отображения ресурсов в инвентаре
     */
    updateResources() {
        const r = gameState.resources;
        document.getElementById('res-food').textContent = r.food;
        document.getElementById('res-water').textContent = r.water;
        document.getElementById('res-medicine').textContent = r.medicine;
        document.getElementById('res-ammo').textContent = r.ammo;
        document.getElementById('res-materials').textContent = r.materials;
        document.getElementById('res-fuel').textContent = r.fuel;
    },
    
    /**
     * Обновление центральной карточки события
     */
    updateEventCard(title, description) {
        document.getElementById('event-title').textContent = title;
        document.getElementById('event-description').innerHTML = description;
    }
};

// ============================================
// МЕНЕДЖЕР СОЗДАНИЯ ПЕРСОНАЖА
// ============================================
const CharacterCreator = {
    selectedBackstory: null,
    selectedGender: 'male',
    
    init() {
        // Слайдер возраста
        const ageSlider = document.getElementById('char-age');
        const ageValue = document.getElementById('age-value');
        
        ageSlider.addEventListener('input', (e) => {
            ageValue.textContent = e.target.value;
        });
        
        // Кнопки пола
        document.querySelectorAll('.btn-gender').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.btn-gender').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedGender = btn.dataset.gender;
            });
        });
        
        // Карточки предыстории
        document.querySelectorAll('.backstory-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.backstory-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedBackstory = card.dataset.backstory;
                
                // Активируем кнопку создания
                this.validateForm();
            });
        });
        
        // Поле имени
        document.getElementById('char-name').addEventListener('input', () => {
            this.validateForm();
        });
        
        // Кнопка создания
        document.getElementById('btn-create-confirm').addEventListener('click', () => {
            this.createCharacter();
        });
    },
    
    validateForm() {
        const name = document.getElementById('char-name').value.trim();
        const btn = document.getElementById('btn-create-confirm');
        
        if (name.length >= 2 && this.selectedBackstory) {
            btn.disabled = false;
        } else {
            btn.disabled = true;
        }
    },
    
    createCharacter() {
        const name = document.getElementById('char-name').value.trim();
        const age = parseInt(document.getElementById('char-age').value);
        const backstoryData = BACKSTORIES[this.selectedBackstory];
        
        // Заполняем данные игрока
        gameState.player.name = name;
        gameState.player.age = age;
        gameState.player.gender = this.selectedGender;
        gameState.player.backstory = this.selectedBackstory;
        
        // Применяем бонусы предыстории
        gameState.player.skills[backstoryData.skillBonus] = 2;
        
        // Добавляем стартовые предметы
        backstoryData.startingItems.forEach(item => {
            this.addStartingItem(item);
        });
        
        // Устанавливаем начальную локацию
        gameState.player.location = 'abandoned_house';
        gameState.location = {
            id: 'abandoned_house',
            name: 'Заброшенный дом',
            description: 'Старый двухэтажный дом на окраине города.'
        };
        
        // Сохраняем и переходим к игре
        SaveSystem.save();
        ScreenManager.show('screen-game');
        
        // Первое сообщение
        UIManager.addLogEntry('Вы проснулись в заброшенном доме. Начинается ваш путь выживания.');
        UIManager.updateEventCard(
            'Новое начало',
            `Вы — ${name}, ${age}-летний ${this.getGenderWord()} ${backstoryData.name.toLowerCase()}. ` +
            `${backstoryData.description}<br><br>` +
            `За окном тихо, но вы знаете — они где-то рядом. Нужно двигаться дальше.`
        );
        
        UIManager.updateStatusBars();
        UIManager.updateTimeInfo();
        UIManager.updateResources();
    },
    
    addStartingItem(item) {
        switch(item) {
            case 'dog':
                gameState.player.hasDog = true;
                gameState.inventory.push({ id: 'dog', name: 'Верная собака', type: 'companion' });
                break;
            case 'pistol':
                gameState.inventory.push({ id: 'pistol', name: 'Пистолет 9мм', type: 'weapon' });
                break;
            case 'ammo_30':
                gameState.resources.ammo += 30;
                break;
            case 'medkit_3':
                gameState.resources.medicine += 3;
                break;
            case 'tools':
                gameState.inventory.push({ id: 'tools', name: 'Набор инструментов', type: 'tool' });
                gameState.resources.materials += 5;
                break;
            case 'backpack':
                gameState.inventory.push({ id: 'backpack', name: 'Рюкзак', type: 'container' });
                break;
            case 'food_5':
                gameState.resources.food += 5;
                break;
            case 'map':
                gameState.inventory.push({ id: 'map', name: 'Карта региона', type: 'special' });
                break;
            case 'radio':
                gameState.inventory.push({ id: 'radio', name: 'Рация', type: 'special' });
                break;
        }
    },
    
    getGenderWord() {
        return this.selectedGender === 'male' ? 'лет' : 'летняя';
    }
};

// ============================================
// ИГРОВОЙ ЦИКЛ
// ============================================
const GameLoop = {
    /**
     * Переход к следующему периоду дня
     */
    nextPeriod() {
        const currentIndex = PERIOD_KEYS.indexOf(gameState.timeOfDay);
        
        // Если это был последний период — новый день
        if (currentIndex === PERIOD_KEYS.length - 1) {
            gameState.day++;
            gameState.timeOfDay = 'morning';
            UIManager.addLogEntry(`Наступил день ${gameState.day}.`);
        } else {
            gameState.timeOfDay = PERIOD_KEYS[currentIndex + 1];
        }
        
        // Потребление ресурсов
        this.consumeResources();
        
        // Проверка состояния игрока
        this.checkPlayerStatus();
        
        // Генерация утреннего события
        if (gameState.timeOfDay === 'morning') {
            this.generateDailyEvent();
        }
        
        // Обновление UI
        UIManager.updateTimeInfo();
        UIManager.updateStatusBars();
        
        // Сохранение
        SaveSystem.save();
        
        // Проверка смерти
        if (gameState.player.health <= 0) {
            this.handleDeath();
        }
    },
    
    /**
     * Потребление ресурсов за период
     */
    consumeResources() {
        gameState.player.hunger = Math.max(0, gameState.player.hunger - 5);
        gameState.player.thirst = Math.max(0, gameState.player.thirst - 7);
        gameState.player.stamina = Math.min(100, gameState.player.stamina + 5);
        
        UIManager.addLogEntry(`Голод: -5, Жажда: -7, Выносливость: +5`);
    },
    
    /**
     * Проверка критического состояния игрока
     */
    checkPlayerStatus() {
        const p = gameState.player;
        
        // Голод
        if (p.hunger === 0) {
            p.health -= 10;
            UIManager.addLogEntry('⚠️ Вы голодаете! Здоровье -10');
        }
        
        // Жажда
        if (p.thirst === 0) {
            p.health -= 15;
            UIManager.addLogEntry('⚠️ Вы обезвожены! Здоровье -15');
        }
        
        // Восстановление настроения ночью
        if (gameState.timeOfDay === 'night' && p.morale < 50) {
            p.morale += 5;
        }
    },
    
    /**
     * Генерация ежедневного события
     */
    generateDailyEvent() {
        const events = [
            {
                title: 'Тихое утро',
                description: 'Утро началось спокойно. Это хороший знак... или плохой?'
            },
            {
                title: 'Странный звук',
                description: 'Вы слышали шум неподалёку. Стоит проверить?'
            },
            {
                title: 'Холодный рассвет',
                description: 'Холодный ветер пронизывает до костей. Нужно найти тёплую одежду.'
            }
        ];
        
        const event = events[Math.floor(Math.random() * events.length)];
        UIManager.updateEventCard(event.title, event.description);
    },
    
    /**
     * Обработка смерти игрока
     */
    handleDeath() {
        // Определяем причину смерти
        let reason = 'Неизвестная причина';
        if (gameState.player.hunger === 0) {
            reason = 'Смерть от голода';
        } else if (gameState.player.thirst === 0) {
            reason = 'Смерть от обезвоживания';
        } else {
            reason = 'Погиб в борьбе за выживание';
        }
        
        document.getElementById('death-reason').textContent = reason;
        document.getElementById('death-days').textContent = gameState.day;
        
        // Очищаем сохранение
        SaveSystem.clear();
        
        // Показываем экран смерти
        ScreenManager.show('screen-death');
    }
};

// ============================================
// ОБРАБОТЧИКИ СОБЫТИЙ
// ============================================
function initEventHandlers() {
    // Кнопка старта
    document.getElementById('btn-start').addEventListener('click', () => {
        ScreenManager.show('screen-create');
    });
    
    // Кнопка продолжения
    document.getElementById('btn-continue').addEventListener('click', () => {
        if (SaveSystem.load()) {
            ScreenManager.show('screen-game');
            UIManager.updateStatusBars();
            UIManager.updateTimeInfo();
            UIManager.updateResources();
            UIManager.renderLog();
        }
    });
    
    // Кнопка следующего периода
    document.getElementById('btn-next-period').addEventListener('click', () => {
        GameLoop.nextPeriod();
    });
    
    // Кнопка исследования
    document.getElementById('btn-explore').addEventListener('click', () => {
        UIManager.addLogEntry('Вы осмотрелись вокруг. Пока ничего интересного.');
        UIManager.updateEventCard('Исследование', 'Вы тщательно осмотрели местность. Вокруг тихо, следов зомби не видно.');
    });
    
    // Кнопка инвентаря
    document.getElementById('btn-inventory').addEventListener('click', () => {
        UIManager.updateResources();
        ScreenManager.showModal('modal-inventory');
    });
    
    // Кнопка карты
    document.getElementById('btn-map').addEventListener('click', () => {
        ScreenManager.showModal('modal-map');
    });
    
    // Кнопка рестарта
    document.getElementById('btn-restart').addEventListener('click', () => {
        resetGame();
        ScreenManager.show('screen-title');
    });
    
    // Закрытие модальных окон
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('active');
            });
        });
    });
    
    // Закрытие по клику вне контента
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
}

// ============================================
// СБРОС ИГРЫ
// ============================================
function resetGame() {
    // Очищаем состояние
    gameState.player = {
        name: '',
        age: 25,
        gender: '',
        backstory: '',
        health: 100,
        maxHealth: 100,
        hunger: 100,
        thirst: 100,
        stamina: 100,
        morale: 50,
        skills: { combat: 0, medicine: 0, crafting: 0, stealth: 0, knowledge: 0, endurance: 0 },
        injuries: [],
        location: 'unknown',
        hasDog: false
    };
    gameState.resources = { food: 0, water: 0, medicine: 0, ammo: 0, materials: 0, fuel: 0 };
    gameState.inventory = [];
    gameState.day = 1;
    gameState.timeOfDay = 'morning';
    gameState.location = null;
    gameState.npcs = [];
    gameState.log = [];
    gameState.flags = {};
    
    // Очищаем UI
    document.getElementById('char-name').value = '';
    document.getElementById('char-age').value = 25;
    document.getElementById('age-value').textContent = '25';
    document.querySelectorAll('.backstory-card').forEach(c => c.classList.remove('selected'));
    CharacterCreator.selectedBackstory = null;
    document.getElementById('btn-create-confirm').disabled = true;
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ YANDEX GAMES SDK
// ============================================
function initYandexSDK() {
    if (window.YaGames) {
        YaGames.init().then(ysdk => {
            console.log('Yandex Games SDK инициализирован');
            // Здесь можно добавить рекламу, лидерборды и т.д.
        }).catch(err => {
            console.error('Ошибка инициализации Yandex SDK:', err);
        });
    }
}

// ============================================
// ЗАПУСК ИГРЫ
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('Zombie Survivor: Last Days загружается...');
    
    // Инициализация
    CharacterCreator.init();
    initEventHandlers();
    initYandexSDK();
    
    // Проверка сохранения
    if (SaveSystem.hasSave()) {
        document.getElementById('btn-continue').style.display = 'block';
    }
    
    console.log('Игра готова к запуску!');
});
