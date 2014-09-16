#pragma strict

class LineJS extends MonoBehaviour
{
	//Start
	public var A: Vector2;
	
	//End
	public var B: Vector2;
	
	//Thickness of line
	public var Thickness: float;

	//Children that contain the pieces that make up the line
	public var StartCapChild : GameObject;
	public var LineChild : GameObject;
	public var EndCapChild : GameObject;

	//Create a new line
	public function Line(a : Vector2, b : Vector2, thickness : float)
	{
		A = a;
		B = b;
		Thickness = thickness;
	}

	//Used to set the color of the line
	public function SetColor(color : Color)
	{
		StartCapChild.GetComponent(SpriteRenderer).color = color;
		LineChild.GetComponent(SpriteRenderer).color = color;
		EndCapChild.GetComponent(SpriteRenderer).color = color;
	}

	//Will actually draw the line
	public function Draw()
	{
		var difference : Vector2 = B - A;
		var rotation : float = Mathf.Atan2(difference.y, difference.x) * Mathf.Rad2Deg;

		//Set the scale of the line to reflect length and thickness
		LineChild.transform.localScale = new Vector3(100 * (difference.magnitude / LineChild.GetComponent(SpriteRenderer).sprite.rect.width), 
		                                             Thickness, 
		                                             LineChild.transform.localScale.z);

		StartCapChild.transform.localScale = new Vector3(StartCapChild.transform.localScale.x, 
		                                                 Thickness, 
		                                                 StartCapChild.transform.localScale.z);

		EndCapChild.transform.localScale = new Vector3(EndCapChild.transform.localScale.x, 
		                                               Thickness, 
		                                               EndCapChild.transform.localScale.z);

		//Rotate the line so that it is facing the right direction
		LineChild.transform.rotation = Quaternion.Euler(new Vector3(0,0, rotation));
		StartCapChild.transform.rotation = Quaternion.Euler(new Vector3(0,0, rotation));
		EndCapChild.transform.rotation = Quaternion.Euler(new Vector3(0,0, rotation + 180));

		//Move the line to be centered on the starting point
		LineChild.transform.position = new Vector3 (A.x, A.y, LineChild.transform.position.z);
		StartCapChild.transform.position = new Vector3 (A.x, A.y, StartCapChild.transform.position.z);
		EndCapChild.transform.position = new Vector3 (A.x, A.y, EndCapChild.transform.position.z);

		//Need to convert rotation to radians at this point for Cos/Sin
		rotation *= Mathf.Deg2Rad;

		//Store these so we only have to access once
		var lineChildWorldAdjust : float = LineChild.transform.localScale.x * LineChild.GetComponent(SpriteRenderer).sprite.rect.width / 2f;
		var startCapChildWorldAdjust : float = StartCapChild.transform.localScale.x * StartCapChild.GetComponent(SpriteRenderer).sprite.rect.width / 2f;
		var endCapChildWorldAdjust : float = EndCapChild.transform.localScale.x * EndCapChild.GetComponent(SpriteRenderer).sprite.rect.width / 2f;

		//Adjust the middle segment to the appropriate position
		LineChild.transform.position += new Vector3 (.01f * Mathf.Cos(rotation) * lineChildWorldAdjust, 
		                                             .01f * Mathf.Sin(rotation) * lineChildWorldAdjust,
		                                             0);

		//Adjust the start cap to the appropriate position
		StartCapChild.transform.position -= new Vector3 (.01f * Mathf.Cos(rotation) * startCapChildWorldAdjust, 
		                                                 .01f * Mathf.Sin(rotation) * startCapChildWorldAdjust,
		                                                 0);

		//Adjust the end cap to the appropriate position
		EndCapChild.transform.position += new Vector3 (.01f * Mathf.Cos(rotation) * lineChildWorldAdjust * 2, 
		                                               .01f * Mathf.Sin(rotation) * lineChildWorldAdjust * 2,
		                                               0);
		EndCapChild.transform.position += new Vector3 (.01f * Mathf.Cos(rotation) * endCapChildWorldAdjust, 
		                                               .01f * Mathf.Sin(rotation) * endCapChildWorldAdjust,
		                                               0);
	}
}