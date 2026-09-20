import { Fragment } from "react";
import { Separator, SizableText, Tabs } from "tamagui";
import {
	LIFT_EXERCISE_LABEL,
	LIFT_EXERCISES,
	type LiftExercise,
} from "@/services/oneRepMax";

/** BIG3 の種目を切り替えるセグメント */
export const LiftExerciseTabs = ({
	exercise,
	onChange,
}: {
	exercise: LiftExercise;
	onChange: (exercise: LiftExercise) => void;
}) => (
	<Tabs
		value={exercise}
		onValueChange={(value) => onChange(value as LiftExercise)}
		orientation="horizontal"
		flexDirection="column"
		width="100%"
	>
		{/* NOTE: Tamagui v2 で Group（Tabs.List）の separator prop が無くなったので手で挟む */}
		<Tabs.List>
			{LIFT_EXERCISES.map((value, index) => (
				<Fragment key={value}>
					{index > 0 && <Separator vertical />}
					{/*
					 * 選択中はアクセントテーマに切り替える
					 *
					 * Tabs.Tab の既定は backgroundColor を $backgroundActive にするだけで、
					 * このテーマでは未選択との差がほとんど出ず、どれを選んでいるか分からない
					 */}
					<Tabs.Tab
						flex={1}
						value={value}
						theme={value === exercise ? "accent" : undefined}
					>
						<SizableText size="$3">{LIFT_EXERCISE_LABEL[value]}</SizableText>
					</Tabs.Tab>
				</Fragment>
			))}
		</Tabs.List>
	</Tabs>
);
