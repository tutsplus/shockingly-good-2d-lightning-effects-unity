using UnityEngine;
using System.Collections.Generic;

class LightningBolt : MonoBehaviour
{
	//List of all of our active/inactive lines
	public List<GameObject> ActiveLineObj;
	public List<GameObject> InactiveLineObj;

	//Prefab for a line
	public GameObject LinePrefab;

	//Transparency
	public float Alpha { get; set; }

	//The speed at which our bolts will fade out
	public float FadeOutRate { get; set; }

	//The color of our bolts
	public Color Tint { get; set; }

	//The position where our bolt started
	public Vector2 Start { get { return ActiveLineObj[0].GetComponent<Line>().A; } }

	//The position where our bolt ended
	public Vector2 End { get { return ActiveLineObj[ActiveLineObj.Count-1].GetComponent<Line>().B; } }

	//True if the bolt has completely faded out
	public bool IsComplete { get { return Alpha <= 0; } }
	
	public void Initialize(int maxSegments)
	{
		//Initialize lists for pooling
		ActiveLineObj = new List<GameObject>();
		InactiveLineObj = new List<GameObject>();

		for(int i = 0; i < maxSegments; i++)
		{
			//instantiate from our Line Prefab
			GameObject line = (GameObject)GameObject.Instantiate(LinePrefab);

			//parent it to our bolt object
			line.transform.parent = transform;

			//set it inactive
			line.SetActive(false);

			//add it to our list
			InactiveLineObj.Add(line);
		}
	}

	public void ActivateBolt(Vector2 source, Vector2 dest, Color color, float thickness)
	{
		//Store tint
		Tint = color;
		
		//Store alpha
		Alpha = 1.5f;
		
		//Store fade out rate
		FadeOutRate = 0.03f;

		//actually create the bolt
		//Prevent from getting a 0 magnitude
		if(Vector2.Distance(dest, source) <= 0)
		{
			Vector2 adjust = Random.insideUnitCircle;
			if(adjust.magnitude <= 0) adjust.x += .1f;
			dest += adjust;
		}
		
		//difference from source to destination
		Vector2 slope = dest - source;
		Vector2 normal = (new Vector2(slope.y, -slope.x)).normalized;
		
		//distance between source and destination
		float distance = slope.magnitude;
		
		List<float> positions = new List<float>();
		positions.Add(0);
		
		for (int i = 0; i < distance / 4; i++) 
		{
			//Generate random positions between 0 and 1 to break up the bolt
			//positions.Add (Random.Range(0f, 1f));
			positions.Add (Random.Range(.25f, .75f));
		}
		
		positions.Sort();
		
		const float Sway = 80;
		const float Jaggedness = 1 / Sway;
		
		//Affects how wide the bolt is allowed to spread
		float spread = 1f;
		
		//Start at the source
		Vector2 prevPoint = source;
		
		//No previous displacement, so just 0
		float prevDisplacement = 0;
		
		for (int i = 1; i < positions.Count; i++)
		{
			//don't allow more than we have in the pool
			int inactiveCount = InactiveLineObj.Count;
			if(inactiveCount <= 0) break;
			
			float pos = positions[i];
			
			//used to prevent sharp angles by ensuring very close positions also have small perpendicular variation.
			float scale = (distance * Jaggedness) * (pos - positions[i - 1]);
			
			//defines an envelope. Points near the middle of the bolt can be further from the central line.
			float envelope = pos > 0.95f ? 20 * (1 - pos) : spread;
			
			float displacement = Random.Range(-Sway, Sway);
			displacement -= (displacement - prevDisplacement) * (1 - scale);
			displacement *= envelope;
			
			//Calculate the end point
			Vector2 point = source + (pos * slope) + (displacement * normal);
			
			activateLine(prevPoint, point, thickness);
			prevPoint = point;
			prevDisplacement = displacement;
		}
		
		activateLine(prevPoint, dest, thickness);
	}
	
	public void DeactivateSegments()
	{
		for(int i = ActiveLineObj.Count - 1; i >= 0; i--)
		{
			GameObject line = ActiveLineObj[i];
			line.SetActive(false);
			ActiveLineObj.RemoveAt(i);
			InactiveLineObj.Add(line);
		}
	}

	void activateLine(Vector2 A, Vector2 B, float thickness)
	{
		//get the inactive count
		int inactiveCount = InactiveLineObj.Count;

		//only activate if we can pull from inactive
		if(inactiveCount <= 0) return;

		//pull the GameObject
		GameObject line = InactiveLineObj[inactiveCount - 1];

		//set it active
		line.SetActive(true);

		//get the Line component
		Line lineComponent = line.GetComponent<Line>();
		lineComponent.SetColor(Color.white);
		lineComponent.A = A;
		lineComponent.B = B;
		lineComponent.Thickness = thickness;
		InactiveLineObj.RemoveAt(inactiveCount - 1);
		ActiveLineObj.Add(line);
	}
	
	public void Draw()
	{
		//if the bolt has faded out, no need to draw
		if (Alpha <= 0) return;

		foreach (GameObject obj in ActiveLineObj)
		{
			Line lineComponent = obj.GetComponent<Line>();
			lineComponent.SetColor(Tint * (Alpha * 0.6f));
			lineComponent.Draw();
		}
	}
	
	public void UpdateBolt()
	{
		Alpha -= FadeOutRate;
	}

	// Returns the point where the bolt is at a given fraction of the way through the bolt. Passing
	// zero will return the start of the bolt, and passing 1 will return the end.
	public Vector2 GetPoint(float position)
	{
		Vector2 start = Start;
		float length = Vector2.Distance(start, End);
		Vector2 dir = (End - start) / length;
		position *= length;

		//find the appropriate line
		Line line = ActiveLineObj.Find(x => Vector2.Dot(x.GetComponent<Line>().B - start, dir) >= position).GetComponent<Line>();
		float lineStartPos = Vector2.Dot(line.A - start, dir);
		float lineEndPos = Vector2.Dot(line.B - start, dir);
		float linePos = (position - lineStartPos) / (lineEndPos - lineStartPos);
		
		return Vector2.Lerp(line.A, line.B, linePos);
	}
}