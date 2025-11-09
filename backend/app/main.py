from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, date
from enum import Enum


class WorkoutType(Enum):
    REST = "Rest"
    EASY_RUN = "Easy Run"
    LONG_RUN = "Long Run"
    SPEED_WORK = "Speed Work"
    TEMPO_RUN = "Tempo Run"
    CROSS_TRAINING = "Cross Training"
    RACE_DAY = "Race Day"


TRAINING_CONFIGS = {
    "marathon": {
        "beginner": {
            "total_weeks": 10,
            "starting_long_run": 6,
            "peak_long_run": 20,
            "weekly_runs": 4,
            "speed_work_start_week": 6,
            "taper_start_week": 8,
        },
        "intermediate": {
            "total_weeks": 18,
            "starting_long_run": 8,
            "peak_long_run": 22,
            "weekly_runs": 5,
            "speed_work_start_week": 4,
            "taper_start_week": 15,
        },
        "advanced": {
            "total_weeks": 16,
            "starting_long_run": 10,
            "peak_long_run": 22,
            "weekly_runs": 6,
            "speed_work_start_week": 2,
            "taper_start_week": 13,
        },
    },
    "half-marathon": {
        "beginner": {
            "total_weeks": 12,
            "starting_long_run": 3,
            "peak_long_run": 10,
            "weekly_runs": 3,
            "speed_work_start_week": 4,
            "taper_start_week": 10,
        },
        "intermediate": {
            "total_weeks": 10,
            "starting_long_run": 4,
            "peak_long_run": 12,
            "weekly_runs": 4,
            "speed_work_start_week": 3,
            "taper_start_week": 8,
        },
        "advanced": {
            "total_weeks": 10,
            "starting_long_run": 5,
            "peak_long_run": 12,
            "weekly_runs": 5,
            "speed_work_start_week": 2,
            "taper_start_week": 8,
        },
    },
}

WEEK_DAYS = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
]


class TrainingPlanGenerator:
    def __init__(self, form_data: Dict[str, Any]):
        self.form_data = form_data
        # Convert half_marathon to half-marathon for config lookup
        race_type = form_data["race_type"].replace("_", "-")
        self.config = TRAINING_CONFIGS[race_type][form_data["skill_level"]]
        self.race_date = datetime.strptime(form_data["race_date"], "%Y-%m-%d").date()
        self.start_date = self._calculate_start_date()
        print(f"Race date: {self.race_date}")
        print(f"Total weeks: {self.config['total_weeks']}")
        print(f"Start date: {self.start_date}")

    def _round_up_distance(self, distance: float) -> int:
        """Round up distance to nearest whole number"""
        return int(-(-distance // 1))  # Ceiling division for positive numbers

    def _calculate_start_date(self) -> date:
        # Calculate start date by going back ((total_weeks - 1) * 7) days from race date
        # Week 1 starts at the beginning, not week 0
        days_back = (self.config["total_weeks"] - 1) * 7

        # Adjust for Sunday races to avoid week overlap
        race_day = self.race_date.strftime("%A").lower()
        if race_day == "sunday":
            days_back += 6  # Add extra days so race week starts after previous week

        print(f"Race date: {self.race_date}, days back: {days_back}")
        result = self.race_date - timedelta(days=days_back)
        print(f"Calculated start date: {result}")
        return result

    def _get_week_start_date(self, week_number: int) -> date:
        if week_number == self.config["total_weeks"]:
            # For race week, start on the Sunday before race day
            race_weekday = self.race_date.weekday()  # 0=Monday, 6=Sunday
            # Calculate days back to previous Sunday
            days_back = (race_weekday - 6) % 7
            if days_back == 0:
                days_back = 7
            race_week_start = self.race_date - timedelta(days=days_back)
            print(
                f"Race week {week_number}, race_day {self.race_date.strftime('%A').lower()}, days_back {days_back}, starting: {race_week_start}"
            )
            return race_week_start

        # For regular weeks, start from calculated start date
        start_date = datetime.combine(self.start_date, datetime.min.time())
        week_start = start_date + timedelta(weeks=week_number - 1)
        result = week_start.date()
        print(f"Week {week_number}, start date: {result}")
        return result

    def _get_date_for_day(self, week_number: int, day_index: int) -> date:
        week_start = self._get_week_start_date(week_number)
        return week_start + timedelta(days=day_index)

    def _is_race_day(self, day_name: str, week_number: int, day_index: int) -> bool:
        # Check if the workout date matches the actual race date
        workout_date = self._get_date_for_day(week_number, day_index)
        return workout_date == self.race_date

    def _calculate_long_run_distance(self, week_number: int) -> int:
        if week_number >= self.config["taper_start_week"]:
            return self._round_up_distance(self._calculate_taper_long_run(week_number))

        progression = (week_number - 1) / (self.config["taper_start_week"] - 1)
        distance = (
            self.config["starting_long_run"]
            + (self.config["peak_long_run"] - self.config["starting_long_run"])
            * progression
        )

        return self._round_up_distance(min(distance, self.config["peak_long_run"]))

    def _calculate_taper_long_run(self, week_number: int) -> float:
        weeks_into_taper = week_number - self.config["taper_start_week"] + 1
        reduction_factor = 0.7**weeks_into_taper
        return self.config["peak_long_run"] * reduction_factor

    def _generate_workout(
        self, day_name: str, week_number: int, is_taper_week: bool, is_race_week: bool
    ) -> Optional[Dict[str, Any]]:
        is_long_run_day = day_name == self.form_data["long_run_day"].lower()
        # Automatically include long run day in training days
        training_days_with_long_run = [
            d.lower() for d in self.form_data["training_days"]
        ] + [self.form_data["long_run_day"].lower()]
        is_training_day = day_name in training_days_with_long_run
        is_race_day = self._is_race_day(
            day_name, week_number, WEEK_DAYS.index(day_name)
        )

        if is_race_week:
            # Race week: only easy shakeout runs and rest, no long runs
            # Use only original training days (exclude long run day)
            training_days_only = [d.lower() for d in self.form_data["training_days"]]
            is_training_day_race_week = day_name in training_days_only

            if is_training_day_race_week:
                return {
                    "type": WorkoutType.EASY_RUN.value,
                    "distance": 2,
                    "description": "Easy shakeout run",
                    "intensity": "Very Easy",
                }

            return {
                "type": WorkoutType.REST.value,
                "description": "Rest",
                "intensity": "Rest",
            }

        if is_taper_week:
            if is_long_run_day:
                taper_distance = self._calculate_taper_long_run(week_number)
                return {
                    "type": WorkoutType.LONG_RUN.value,
                    "distance": self._round_up_distance(taper_distance),
                    "description": f"Taper long run - {self._round_up_distance(taper_distance)} miles",
                    "intensity": "Easy",
                }

            if is_training_day:
                return {
                    "type": WorkoutType.EASY_RUN.value,
                    "distance": 3,
                    "description": "Easy run",
                    "intensity": "Easy",
                }

            return {
                "type": WorkoutType.REST.value,
                "description": "Rest",
                "intensity": "Rest",
            }

        if is_long_run_day:
            long_run_distance = self._calculate_long_run_distance(week_number)
            return {
                "type": WorkoutType.LONG_RUN.value,
                "distance": long_run_distance,
                "description": f"Long run - {long_run_distance} miles",
                "intensity": "Easy to Moderate",
            }

        if is_training_day:
            return self._generate_regular_workout(day_name, week_number)

        return {
            "type": WorkoutType.REST.value,
            "description": "Rest",
            "intensity": "Rest",
        }

    def _generate_regular_workout(
        self, day_name: str, week_number: int
    ) -> Dict[str, Any]:
        has_speed_work = week_number >= self.config["speed_work_start_week"]
        training_days_lower = [d.lower() for d in self.form_data["training_days"]]
        workout_number = (
            training_days_lower.index(day_name)
            if day_name in training_days_lower
            else -1
        )

        if has_speed_work and workout_number == 1:
            return {
                "type": WorkoutType.SPEED_WORK.value,
                "distance": 4,
                "description": "Intervals: 6x800m with 400m recovery",
                "intensity": "Hard",
            }

        if has_speed_work and workout_number == 2:
            return {
                "type": WorkoutType.TEMPO_RUN.value,
                "distance": 5,
                "description": "Tempo run: 2 miles at tempo pace",
                "intensity": "Moderate to Hard",
            }

        easy_distance = 3 + (week_number // 4)
        return {
            "type": WorkoutType.EASY_RUN.value,
            "distance": easy_distance,
            "description": "Easy run",
            "intensity": "Easy",
        }

    def _generate_week(self, week_number: int) -> Dict[str, Any]:
        week_plan = {
            "week": week_number,
            "startDate": self._get_week_start_date(week_number).isoformat(),
            "workouts": [],
        }

        is_taper_week = week_number >= self.config["taper_start_week"]
        is_race_week = week_number == self.config["total_weeks"]

        # Special handling for race week - generate workouts for the final week
        if is_race_week:
            race_week_start = self._get_week_start_date(week_number)
            race_day_name = self.race_date.strftime("%A").lower()

            # For Sunday races, include the race day (8 days total)
            # For other races, 7 days ending on race day
            max_days = 8 if race_day_name == "sunday" else 7

            for day_index in range(max_days):
                workout_date = race_week_start + timedelta(days=day_index)
                day_name = workout_date.strftime("%A").lower()

                # Handle race day
                if workout_date == self.race_date:
                    week_plan["workouts"].append(
                        {
                            "day": day_name,
                            "date": self.race_date.isoformat(),
                            "type": WorkoutType.RACE_DAY.value,
                            "distance": (
                                26.2
                                if self.form_data["race_type"] == "marathon"
                                else 13.1
                            ),
                            "description": "Race Day!",
                            "intensity": "Race",
                        }
                    )
                    continue

                # Generate workout for non-race days
                workout = self._generate_workout(
                    day_name, week_number, is_taper_week, is_race_week
                )

                if workout:
                    week_plan["workouts"].append(
                        {
                            "day": day_name,
                            "date": workout_date.isoformat(),
                            **workout,
                        }
                    )
                    continue

                # Generate workout for non-race days
                workout = self._generate_workout(
                    day_name, week_number, is_taper_week, is_race_week
                )

                if workout:
                    week_plan["workouts"].append(
                        {
                            "day": day_name,
                            "date": workout_date.isoformat(),
                            **workout,
                        }
                    )
                    continue

                # Generate workout for non-race days
                workout = self._generate_workout(
                    day_name, week_number, is_taper_week, is_race_week
                )

                if workout:
                    week_plan["workouts"].append(
                        {
                            "day": day_name,
                            "date": workout_date.isoformat(),
                            **workout,
                        }
                    )

        else:
            # Regular week - generate workouts only for specified training days
            week_start_date = self._get_week_start_date(week_number)

            # Generate workouts for each day of the week (7 days total)
            for day_index in range(7):
                workout_date = week_start_date + timedelta(days=day_index)
                day_name = workout_date.strftime("%A").lower()

                # Skip race day in regular generation for race week
                if is_race_week and workout_date == self.race_date:
                    continue

                # Only generate workouts for specified training days (including long run day)
                training_days_with_long_run = [
                    d.lower() for d in self.form_data["training_days"]
                ] + [self.form_data["long_run_day"].lower()]
                if day_name in training_days_with_long_run:
                    workout = self._generate_workout(
                        day_name, week_number, is_taper_week, is_race_week
                    )

                    if workout:
                        week_plan["workouts"].append(
                            {
                                "day": day_name,
                                "date": workout_date.isoformat(),
                                **workout,
                            }
                        )

        # Sort workouts by date for proper chronological display
        if is_race_week:
            week_plan["workouts"].sort(key=lambda x: x["date"])

        return week_plan

    def generate_plan(self) -> List[Dict[str, Any]]:
        plan = []

        for week in range(1, self.config["total_weeks"] + 1):
            week_plan = self._generate_week(week)
            plan.append(week_plan)

        return plan


def generate_training_plan(form_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    generator = TrainingPlanGenerator(form_data)
    return generator.generate_plan()


app = FastAPI(title="Training Plan API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://planner.run"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TrainingPlanRequest(BaseModel):
    race_type: str
    skill_level: str
    race_date: str
    long_run_day: str
    training_days: List[str]

    class Config:
        json_schema_extra = {
            "example": {
                "race_type": "marathon",
                "skill_level": "beginner",
                "race_date": "2026-01-25",
                "long_run_day": "saturday",
                "training_days": ["monday", "wednesday", "friday", "saturday"],
            }
        }


@app.get("/")
async def root():
    return {"message": "Training Plan API"}


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}


@app.post("/api/generate-plan")
async def generate_plan(request: TrainingPlanRequest):
    """Generate a training plan based on user input"""
    try:
        print(f"Received request: {request}")
        print(f"Request data: {request.model_dump()}")

        # Convert Pydantic model to dict for training plan generator
        form_data = {
            "race_type": request.race_type,
            "skill_level": request.skill_level,
            "race_date": request.race_date,
            "long_run_day": request.long_run_day,
            "training_days": request.training_days,
        }

        print(f"Form data for generator: {form_data}")

        plan = generate_training_plan(form_data)
        return {"success": True, "plan": plan}
    except Exception as e:
        print(f"Error: {str(e)}")
        return {"success": False, "error": str(e)}
